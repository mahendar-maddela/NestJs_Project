import { Injectable, Logger } from '@nestjs/common';
import { WebSocket } from 'ws';
import { BootNotificationHandlerV16 } from './handlers/boot-notification.handler';
import { AuthorizeHandlerV16 } from './handlers/authorize.handler';
import { StartTransactionHandlerV16 } from './handlers/start-transaction.handler';
import { StopTransactionHandlerV16 } from './handlers/stop-transaction.handler';
import { MeterValuesHandlerV16 } from './handlers/meter-values.handler';
import { StatusNotificationHandlerV16 } from './handlers/status-notification.handler';
import { DataTransferHandlerV16 } from './handlers/data-transfer.handler';
import { FirmwareDiagnosticsHandlerV16 } from './handlers/firmware-diagnostics.handler';
import { ConfigurationHandlerV16 } from './handlers/configuration.handler';
import { v4 as uuidv4 } from 'uuid';
import { OcppLoggerService } from '../common/services/ocpp-logger.service';
import { PendingCallRegistry } from '../common/registry/pending-call.registry';

@Injectable()
export class Ocpp16Router {
  private readonly logger = new Logger(Ocpp16Router.name);

  constructor(
    private readonly bootNotificationHandler: BootNotificationHandlerV16,
    private readonly authorizeHandler: AuthorizeHandlerV16,
    private readonly startTransactionHandler: StartTransactionHandlerV16,
    private readonly stopTransactionHandler: StopTransactionHandlerV16,
    private readonly meterValuesHandler: MeterValuesHandlerV16,
    private readonly statusNotificationHandler: StatusNotificationHandlerV16,
    private readonly dataTransferHandler: DataTransferHandlerV16,
    private readonly firmwareDiagnosticsHandler: FirmwareDiagnosticsHandlerV16,
    private readonly configurationHandler: ConfigurationHandlerV16,
    private readonly ocppLoggerService: OcppLoggerService,
    private readonly pendingCallRegistry: PendingCallRegistry,
  ) { }

  async handleMessage(ws: WebSocket, incoming: any[], chargerIdStr: string): Promise<void> {
    const messageId = incoming[1];
    const action = incoming[2];

    // Log incoming packet from charger
    await this.ocppLoggerService.logData(incoming, chargerIdStr, 1, action);

    // CALLRESULT/CALLERROR for a command *we* sent (RemoteStartTransaction, RemoteStopTransaction, ...)
    // takes priority over the action-name dispatch below, since those frames carry no action name.
    if (this.pendingCallRegistry.handleIncoming(incoming)) {
      return;
    }

    if (incoming.includes('BootNotification') || action === 'BootNotification') {
      const res = await this.bootNotificationHandler.handle(incoming, chargerIdStr);
      ws.send(JSON.stringify(res));
      await this.ocppLoggerService.logData(res, chargerIdStr, 2, 'BootNotification');
      return;
    }

    if (incoming.includes('Heartbeat') || action === 'Heartbeat') {
      const res = [3, messageId, { currentTime: new Date().toISOString() }];
      ws.send(JSON.stringify(res));
      await this.ocppLoggerService.logData(res, chargerIdStr, 2, 'Heartbeat');
      return;
    }

    if (incoming.includes('Authorize') || action === 'Authorize') {
      const res = await this.authorizeHandler.handle(incoming, chargerIdStr);
      ws.send(JSON.stringify(res));
      await this.ocppLoggerService.logData(res, chargerIdStr, 2, 'Authorize');
      return;
    }

    if (incoming.includes('StartTransaction') || action === 'StartTransaction') {
      // StartTransaction may send its own response (session-based flow) or return the response
      const res = await this.startTransactionHandler.handle(incoming, chargerIdStr, ws);
      if (res) {
        // Only send if handler didn't already send directly (VID / RFID flows)
        ws.send(JSON.stringify(res));
        await this.ocppLoggerService.logData(res, chargerIdStr, 2, 'StartTransaction');
      }
      return;
    }

    if (incoming.includes('StopTransaction') || action === 'StopTransaction') {
      const result = await this.stopTransactionHandler.handle(incoming);
      // StopTransaction returns either an OCPP array or { status, message } for admin stops
      if (Array.isArray(result)) {
        ws.send(JSON.stringify(result));
        await this.ocppLoggerService.logData(result, chargerIdStr, 2, 'StopTransaction');
      }
      return;
    }

    if (incoming.includes('MeterValues') || action === 'MeterValues') {
      const res = await this.meterValuesHandler.handle(incoming, chargerIdStr, ws);
      ws.send(JSON.stringify(res));
      await this.ocppLoggerService.logData(res, chargerIdStr, 2, 'MeterValues');
      return;
    }

    if (incoming.includes('StatusNotification') || action === 'StatusNotification') {
      const { response } = await this.statusNotificationHandler.handle(incoming, chargerIdStr);
      ws.send(JSON.stringify(response));
      await this.ocppLoggerService.logData(response, chargerIdStr, 2, 'StatusNotification');

      // Mirrors legacy `ocppRouter.js` — when a connector reports Available, tell the charger to clear
      // its cached auth data so freshly issued RFID tags / tokens take effect immediately.
      const { status } = incoming[3] || {};
      if (status === 'Available') {
        const clearCacheReq = [2, uuidv4(), 'ClearCache', {}];
        ws.send(JSON.stringify(clearCacheReq));
        await this.ocppLoggerService.logData(clearCacheReq, chargerIdStr, 2, 'ClearCache');
      }
      return;
    }

    if (incoming.includes('DataTransfer') || action === 'DataTransfer') {
      const res = await this.dataTransferHandler.handle(incoming, chargerIdStr, ws);
      ws.send(JSON.stringify(res));
      await this.ocppLoggerService.logData(res, chargerIdStr, 2, 'DataTransfer');
      return;
    }

    if (
      incoming.includes('DiagnosticsStatusNotification') ||
      action === 'DiagnosticsStatusNotification' ||
      incoming.includes('FirmwareStatusNotification') ||
      action === 'FirmwareStatusNotification'
    ) {
      const res = await this.firmwareDiagnosticsHandler.handle(incoming);
      ws.send(JSON.stringify(res));
      await this.ocppLoggerService.logData(res, chargerIdStr, 2, action || 'FirmwareStatusNotification');
      return;
    }

    // GetConfiguration response (message[2] has configurationKey)
    if (incoming[2]?.configurationKey) {
      await this.configurationHandler.handle(incoming, chargerIdStr);
      return;
    }

    this.logger.warn(`Unknown OCPP 1.6 action: ${action} for charger ${chargerIdStr}`);
  }
}
