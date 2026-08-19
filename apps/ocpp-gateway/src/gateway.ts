import { Injectable, Logger } from '@nestjs/common';
import { WebSocket } from 'ws';
import { ConnectionRegistry } from './common/registry/connection.registry';
import { Ocpp16Router } from './v16/v16.router';
import { Ocpp201Router } from './v201/v201.router';
import { OcppLoggerService } from './common/services/ocpp-logger.service';
import { DataSource } from 'typeorm';
import { ChargerStatus, ConnectorStatus } from 'database/src';

@Injectable()
export class OcppGateway {
  private readonly logger = new Logger(OcppGateway.name);

  constructor(
    private readonly connectionRegistry: ConnectionRegistry,
    private readonly ocpp16Router: Ocpp16Router,
    private readonly ocpp201Router: Ocpp201Router,
    private readonly ocppLoggerService: OcppLoggerService,
    private readonly dataSource: DataSource,
  ) {}

  async handleConnection(ws: WebSocket, chargerIdStr: string, protocolVersion: string = '1.6') {
    this.logger.log(`WebSocket connected to Charger [${chargerIdStr}] using OCPP v${protocolVersion}`);

    setTimeout(() => {
      if (ws.readyState === WebSocket.CONNECTING) {
        this.logger.warn(`Terminating client in CONNECTING state for ${chargerIdStr}`);
        ws.terminate();
      }
    }, 30000);

    // Event listeners are attached FIRST, synchronously, before any `await` — a real charger (and
    // legacy's `ws.on("message", ...)`, registered synchronously) can send BootNotification the
    // instant the handshake completes. Node's EventEmitter drops events with no listener attached
    // yet, so awaiting the DB reconciliation below *before* wiring `message` risked silently losing
    // that very first frame whenever it beat the DB round-trip — the connection would then just sit
    // there until the charger's own retry/timeout, looking exactly like "the gateway isn't working".
    ws.on('message', async (data: any) => {
      try {
        const messageString = data.toString();
        const incoming = JSON.parse(messageString);

        if (protocolVersion.startsWith('2.')) {
          await this.ocpp201Router.handleMessage(ws, incoming, chargerIdStr);
        } else {
          await this.ocpp16Router.handleMessage(ws, incoming, chargerIdStr);
        }
      } catch (err: any) {
        this.logger.error(`Error processing WebSocket message for ${chargerIdStr}: ${err.message}`);
      }
    });

    ws.on('ping', () => {
      ws.pong();
    });

    ws.on('error', (err: any) => {
      this.logger.error(`WebSocket error for Charger ${chargerIdStr}: ${err.message}`);
    });

    ws.on('close', async () => {
      const activeCharger = await this.dataSource
        .createQueryBuilder()
        .select('c.*')
        .from('chargers', 'c')
        .where('c.chargerId = :chargerIdStr', { chargerIdStr })
        .getRawOne();

      if (activeCharger) {
        await this.dataSource
          .createQueryBuilder()
          .update('chargers')
          .set({ status: 'InActive' as any })
          .where('id = :id', { id: activeCharger.id })
          .execute();

        const connectors = await this.dataSource
          .createQueryBuilder()
          .select('cn.*')
          .from('connectors', 'cn')
          .where('cn.chargerId = :chargerId', { chargerId: activeCharger.id })
          .getRawMany();

        for (const connector of connectors) {
          await this.dataSource
            .createQueryBuilder()
            .update('connectors')
            .set({ status: 'Unavailable' as any })
            .where('id = :id', { id: connector.id })
            .execute();
        }
      }

      await this.ocppLoggerService.logData('Contact the Charger', chargerIdStr, 3, 'Connection closed');
      this.connectionRegistry.unregister(chargerIdStr);
      this.logger.log(`Client disconnected from Charger with ID: ${chargerIdStr}`);
    });

    const existingWs = this.connectionRegistry.get(chargerIdStr);
    if (existingWs && existingWs !== ws) {
      this.logger.warn(`Disconnecting stale WebSocket for Charger [${chargerIdStr}] before registering new connection.`);
      try {
        existingWs.removeAllListeners();
        existingWs.terminate();
      } catch {
        // Ignore termination error
      }
      this.connectionRegistry.unregister(chargerIdStr);
    }

    const isExisting = this.connectionRegistry.has(chargerIdStr);
    this.connectionRegistry.register(chargerIdStr, ws);

    if (!isExisting) {
      const inActiveCharger = await this.dataSource
        .createQueryBuilder()
        .select('c.*')
        .from('chargers', 'c')
        .where('c.chargerId = :chargerIdStr AND c.status = :status', {
          chargerIdStr,
          status: 'InActive',
        })
        .getRawOne();

      if (inActiveCharger) {
        await this.dataSource
          .createQueryBuilder()
          .update('chargers')
          .set({ status: 'Active' as any })
          .where('id = :id', { id: inActiveCharger.id })
          .execute();

        const connectors = await this.dataSource
          .createQueryBuilder()
          .select('cn.*')
          .from('connectors', 'cn')
          .where('cn.chargerId = :chargerId', { chargerId: inActiveCharger.id })
          .getRawMany();

        for (const connector of connectors) {
          const runningTx = await this.dataSource
            .createQueryBuilder()
            .select('dt.*')
            .from('devicetransactions', 'dt')
            .where('dt.connectorId = :cId AND dt.chargerId = :chStr AND dt.chargerRef = :chRef AND dt.status = 0', {
              cId: connector.connectorId,
              chStr: chargerIdStr,
              chRef: inActiveCharger.id,
            })
            .getRawOne();

          const newStatus = runningTx ? 'Charging' : 'Available';
          if (connector.status !== newStatus) {
            await this.dataSource
              .createQueryBuilder()
              .update('connectors')
              .set({ status: newStatus as any })
              .where('id = :id', { id: connector.id })
              .execute();
          }
        }
      }
    }
  }
}
