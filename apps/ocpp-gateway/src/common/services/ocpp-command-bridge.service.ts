import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RedisService } from '@app/redis';
import { ConnectionRegistry } from '../registry/connection.registry';
import { PendingCallRegistry } from '../registry/pending-call.registry';
import { OcppLoggerService } from './ocpp-logger.service';
import { StopTransactionHandlerV16 } from '../../v16/handlers/stop-transaction.handler';

export const OCPP_COMMAND_REQUEST_CHANNEL = 'ocpp:command:request';
export const OCPP_COMMAND_RESPONSE_CHANNEL = 'ocpp:command:response';

export interface CommandRequest {
  correlationId: string;
  chargerId: string;
  action: string;
  payload: Record<string, unknown>;
  timeoutMs?: number;
  /** Send the CALL and acknowledge immediately, without awaiting the charger's CALLRESULT (mirrors legacy's `sendWebSocketRequest`). */
  fireAndForget?: boolean;
}

export interface CommandResult {
  success: boolean;
  result?: unknown;
  error?: string;
}

/**
 * Bridges REST-triggered OCPP commands (RemoteStartTransaction, RemoteStopTransaction, ...) from
 * apps/api — which has no WebSocket connection to any charger — into this process, which does.
 * apps/api publishes a request on OCPP_COMMAND_REQUEST_CHANNEL and awaits a matching response on
 * OCPP_COMMAND_RESPONSE_CHANNEL; this service is the only thing that actually talks to the charger.
 */
@Injectable()
export class OcppCommandBridgeService implements OnModuleInit {
  private readonly logger = new Logger(OcppCommandBridgeService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly connectionRegistry: ConnectionRegistry,
    private readonly pendingCallRegistry: PendingCallRegistry,
    private readonly ocppLogger: OcppLoggerService,
    private readonly stopTransactionHandler: StopTransactionHandlerV16,
  ) {}

  onModuleInit(): void {
    // Queued and auto-(re)subscribed by RedisService if Redis isn't ready yet — no raw
    // "Connection is closed" errors when Redis is down at startup.
    this.redisService.subscribe(OCPP_COMMAND_REQUEST_CHANNEL, (channel, message) => {
      this.handleRequest(message).catch((err) => this.logger.error(`Command bridge error: ${err.message}`));
    });
  }

  private async handleRequest(raw: string): Promise<void> {
    let request: CommandRequest;
    try {
      request = JSON.parse(raw);
    } catch {
      this.logger.warn('Received malformed command request');
      return;
    }

    const result = await this.processCommand(request);
    await this.publishResponse(request.correlationId, result);
  }

  /**
   * Core command handling, shared by the Redis-subscriber path above and the direct-HTTP fallback
   * path (`InternalOcppCommandController`) used when `apps/api` can't reach Redis to publish a
   * request at all — the live charger WebSocket connection here is unaffected by Redis either way,
   * so this method never needs to know or care which transport carried the request in.
   */
  async processCommand(request: CommandRequest): Promise<CommandResult> {
    const { chargerId, action, payload, timeoutMs, fireAndForget } = request;

    if (action === 'CheckConnection') {
      // Connectivity probe only — no frame sent. Lets apps/api guard a flow (e.g. admin RemoteStop)
      // on "is this charger reachable" before mutating any DB state, matching legacy's check order.
      return { success: true, result: { connected: this.connectionRegistry.has(chargerId) } };
    }

    if (fireAndForget) {
      return this.handleFireAndForget(chargerId, action, payload);
    }

    if (action === 'AdminStopTransaction') {
      // Settlement-only: no OCPP frame is sent to a charger, so it doesn't need a live connection.
      try {
        const result = await this.stopTransactionHandler.handle([2, randomUUID(), 'StopTransaction', payload]);
        return { success: true, result };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    if (!this.connectionRegistry.has(chargerId)) {
      return { success: false, error: `Charger ${chargerId} is not connected` };
    }

    try {
      const result = await this.pendingCallRegistry.sendCall(chargerId, action, payload, timeoutMs ?? 30000);
      return { success: true, result };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /** Mirrors legacy's `sendWebSocketRequest`: send the CALL and respond immediately without waiting for a CALLRESULT. */
  private async handleFireAndForget(chargerId: string, action: string, payload: Record<string, unknown>): Promise<CommandResult> {
    const socket = this.connectionRegistry.get(chargerId);

    if (!socket) {
      await this.ocppLogger.logData([2, randomUUID(), 'Broken Pipe', 'Transport Error'], chargerId, 2);
      return { success: false, error: 'Charge point is unavailable at this moment. Please try again after some time' };
    }

    const frame = [2, randomUUID(), action, payload];
    socket.send(JSON.stringify(frame));
    await this.ocppLogger.logData(frame, chargerId, 2, action);

    return { success: true, result: { message: `${action} request sent successfully` } };
  }

  private async publishResponse(correlationId: string, body: CommandResult) {
    await this.redisService.publish(OCPP_COMMAND_RESPONSE_CHANNEL, JSON.stringify({ correlationId, ...body }));
  }
}
