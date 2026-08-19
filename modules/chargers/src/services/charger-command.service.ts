import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { RedisService } from '@app/redis';

const OCPP_COMMAND_REQUEST_CHANNEL = 'ocpp:command:request';
const OCPP_COMMAND_RESPONSE_CHANNEL = 'ocpp:command:response';
const DEFAULT_TIMEOUT_MS = 30000;

interface PendingCommand {
  resolve: (value: any) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
}

/**
 * REST-facing side of the OCPP command bridge. apps/api has no WebSocket connection to any
 * charger — apps/ocpp-gateway does — so commands cross process boundaries via Redis pub/sub:
 * publish on OCPP_COMMAND_REQUEST_CHANNEL, the gateway process actually talks to the charger,
 * and replies on OCPP_COMMAND_RESPONSE_CHANNEL. See apps/ocpp-gateway/src/common/services/
 * ocpp-command-bridge.service.ts for the other end.
 *
 * Redis is the default transport but never a hard dependency for charging control: if a publish
 * doesn't actually go out (`RedisService.publish` returns 0 when disconnected), `dispatch()` falls
 * back to a direct HTTP call to the gateway's `internal/ocpp-command` endpoint instead of waiting
 * out a timeout that can only fail. Per CLAUDE.md, a Redis outage must not stop RemoteStart/
 * RemoteStop/Reset from working.
 */
@Injectable()
export class ChargerCommandService implements OnModuleInit, OnModuleDestroy {
  private readonly pending = new Map<string, PendingCommand>();

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) { }

  onModuleInit(): void {
    // Queued and auto-(re)subscribed by RedisService if Redis isn't ready yet — no raw
    // "Connection is closed" errors when Redis is down at startup.
    this.redisService.subscribe(OCPP_COMMAND_RESPONSE_CHANNEL, (channel, message) => {
      this.handleResponse(message);
    });
  }

  onModuleDestroy(): void {
    for (const { timer, reject } of this.pending.values()) {
      clearTimeout(timer);
      reject(new Error('Shutting down'));
    }
    this.pending.clear();
  }

  private handleResponse(raw: string): void {
    let body: { correlationId: string; success: boolean; result?: unknown; error?: string };
    try {
      body = JSON.parse(raw);
    } catch {
      return;
    }
    const pending = this.pending.get(body.correlationId);
    if (!pending) return;

    clearTimeout(pending.timer);
    this.pending.delete(body.correlationId);
    if (body.success) pending.resolve(body.result);
    else pending.reject(new Error(body.error || 'Command failed'));
  }

  private async dispatch(chargerId: string, action: string, payload: Record<string, unknown>, timeoutMs = DEFAULT_TIMEOUT_MS, fireAndForget = false) {
    const correlationId = randomUUID();

    const resultPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(correlationId);
        reject(new Error(`Timed out waiting for ${action} response from charger ${chargerId}`));
      }, timeoutMs);
      this.pending.set(correlationId, { resolve, reject, timer });
    });

    const published = await this.redisService.publish(
      OCPP_COMMAND_REQUEST_CHANNEL,
      JSON.stringify({ correlationId, chargerId, action, payload, timeoutMs, fireAndForget }),
    );

    if (published === 0) {
      // Redis didn't actually accept the publish (disconnected or erroring) — no point waiting out
      // the timeout above for a response that will never arrive. Resolve/reject this same pending
      // promise directly from the HTTP fallback instead.
      const pending = this.pending.get(correlationId);
      this.dispatchViaHttp(correlationId, chargerId, action, payload, timeoutMs, fireAndForget)
        .then((result) => pending && this.resolvePending(correlationId, { success: true, result }))
        .catch((err: any) => pending && this.resolvePending(correlationId, { success: false, error: err.message }));
    }

    return resultPromise;
  }

  private resolvePending(correlationId: string, body: { success: boolean; result?: unknown; error?: string }): void {
    const pending = this.pending.get(correlationId);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pending.delete(correlationId);
    if (body.success) pending.resolve(body.result);
    else pending.reject(new Error(body.error || 'Command failed'));
  }

  /** Direct fallback to apps/ocpp-gateway when Redis pub/sub is unavailable — see class doc. */
  private async dispatchViaHttp(
    correlationId: string,
    chargerId: string,
    action: string,
    payload: Record<string, unknown>,
    timeoutMs: number,
    fireAndForget: boolean,
  ): Promise<unknown> {
    const baseUrl = this.configService.get<string>('OCPP_GATEWAY_INTERNAL_URL', 'http://localhost:8000');
    const secret = this.configService.get<string>('INTERNAL_COMMAND_SECRET', '');

    const response = await fetch(`${baseUrl}/internal/ocpp-command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-secret': secret },
      body: JSON.stringify({ correlationId, chargerId, action, payload, timeoutMs, fireAndForget }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      throw new Error(`HTTP fallback to gateway failed (${response.status})`);
    }

    const body = (await response.json()) as { success: boolean; result?: unknown; error?: string };
    if (!body.success) throw new Error(body.error || 'Command failed');
    return body.result;
  }

  /** Sends RemoteStartTransaction.req to the charger and resolves with its RemoteStartTransaction.conf. */
  async remoteStartTransaction(chargerId: string, connectorId: number, idTag: string) {
    try {
      const result: any = await this.dispatch(chargerId, 'RemoteStartTransaction', { connectorId, idTag });
      return { success: result?.status === 'Accepted', chargerId, connectorId, status: result?.status ?? 'Unknown' };
    } catch (err: any) {
      return { success: false, chargerId, connectorId, status: 'Unavailable', message: err.message };
    }
  }

  /** Sends RemoteStopTransaction.req to the charger and resolves with its RemoteStopTransaction.conf. */
  async remoteStopTransaction(chargerId: string, transactionId: number) {
    try {
      const result: any = await this.dispatch(chargerId, 'RemoteStopTransaction', { transactionId });
      return { success: result?.status === 'Accepted', chargerId, transactionId, status: result?.status ?? 'Unknown' };
    } catch (err: any) {
      return { success: false, chargerId, transactionId, status: 'Unavailable', message: err.message };
    }
  }

  /**
   * Admin-forced settlement of a transaction that was never closed by a real OCPP StopTransaction
   * (mirrors legacy's direct `handleStopTransaction(["", "", "", { ...isAbnormalAdminStop: true }])`
   * call from the dashboard controller). Runs entirely in apps/ocpp-gateway via
   * StopTransactionHandlerV16 — no live charger connection required, unlike remoteStopTransaction.
   */
  async adminForceStopTransaction(transactionId: number, meterStop: number, reason = 'Other') {
    try {
      const result: any = await this.dispatch('admin', 'AdminStopTransaction', {
        transactionId,
        meterStop,
        reason,
        isAbnormalAdminStop: true,
      });
      return result as { status: number; message: string };
    } catch (err: any) {
      return { status: 500, message: 'Not stopped session stopped failed' };
    }
  }

  /** Checks whether a charger currently has a live WebSocket connection to the gateway, without sending it anything. */
  async isChargerConnected(chargerId: string): Promise<boolean> {
    try {
      const result: any = await this.dispatch(chargerId, 'CheckConnection', {}, 5000);
      return Boolean(result?.connected);
    } catch {
      return false;
    }
  }

  /**
   * Sends an arbitrary OCPP CALL and acknowledges once the gateway has sent it, without waiting for
   * the charger's CALLRESULT (mirrors legacy's `sendWebSocketRequest` used by the admin OCPP command
   * routes: ChangeAvailability, ClearCache, Reset, TriggerMessage, ChangeConfiguration,
   * GetConfiguration, UpdateFirmware, DataTransfer).
   */
  async sendFireAndForgetCommand(chargerId: string, action: string, payload: Record<string, unknown>) {
    try {
      const result: any = await this.dispatch(chargerId, action, payload, DEFAULT_TIMEOUT_MS, true);
      return { success: true, message: result?.message ?? `${action} request sent successfully` };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }
}
