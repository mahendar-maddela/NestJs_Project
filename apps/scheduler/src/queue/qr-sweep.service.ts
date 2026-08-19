import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { Queue, Worker } from 'bullmq';
import { RedisService } from '@app/redis';
import { QR_REFUND_REQUEST_CHANNEL, QrRefundRequestPayload } from '@app/common';
import { QrSweepRepository } from './qr-sweep.repository';

const QUEUE_NAME = 'qr-pay-charge-sweep';
const REPEAT_JOB_ID = 'qr-sweep-repeat';
const MAX_ATTEMPTS = 5;
const SWEEP_INTERVAL_MS = 20000;
const REMOTE_START_TIMEOUT_MS = 30000;

/** Mirrors `ChargerCommandService.sendFireAndForgetCommand`'s wire format, without the response
 *  round-trip (the sweeper doesn't need it — like legacy's synchronous `websocket.send()`, it just
 *  fires and re-checks on the next tick regardless of outcome). */
const OCPP_COMMAND_REQUEST_CHANNEL = 'ocpp:command:request';

/** Mirrors `OCPP/payAndChargeFeature/remoteStartManager.js` — retries RemoteStartTransaction for stuck QRPAY sessions, refunding once attempts are exhausted. */
@Injectable()
export class QrSweepService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QrSweepService.name);
  private queue!: Queue;
  private worker!: Worker;

  constructor(
    private readonly configService: ConfigService,
    private readonly qrSweepRepo: QrSweepRepository,
    private readonly redisService: RedisService,
  ) { }

  async onModuleInit(): Promise<void> {
    const connection = {
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD') || undefined,
    };

    this.queue = new Queue(QUEUE_NAME, { connection });
    // Not awaited: registering the repeatable job needs a live Redis round-trip, and BullMQ's Worker
    // connection requires unbounded retries (maxRetriesPerRequest: null), so awaiting here would block
    // the whole app's bootstrap indefinitely if Redis isn't reachable yet. Errors are logged, not thrown.
    this.queue.add('sweep', {}, { repeat: { every: SWEEP_INTERVAL_MS }, jobId: REPEAT_JOB_ID }).catch((err) => this.logger.error(`Failed to schedule QR sweep job: ${err.message}`));

    this.worker = new Worker(QUEUE_NAME, async () => this.sweepOnce(), { connection });
    this.worker.on('failed', (job, err) => this.logger.error(`QR sweep tick failed: ${err?.message}`));
    this.worker.on('error', (err) => this.logger.error(`QR sweep worker error: ${err.message}`));

    this.logger.log('RemoteStart sweeper started');
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }

  /** Mirrors `remoteStartManager.js:sweepOnce`. */
  private async sweepOnce(): Promise<void> {
    const dueSessions = await this.qrSweepRepo.findDueQrSweepSessions();
    if (!dueSessions.length) return;

    for (const session of dueSessions) {
      try {
        if ((session.remoteStartAttempts || 0) >= MAX_ATTEMPTS) {
          await this.publishRefund(session, 'Max attempts exhausted');
          continue;
        }

        const charger = await this.qrSweepRepo.findChargerById(session.chargerRef as number);
        if (!charger) {
          await this.publishRefund(session, 'Charger not found');
          continue;
        }

        const nextAttempt = (session.remoteStartAttempts || 0) + 1;
        await this.dispatchRemoteStart(charger.chargerId, session.connectorId, session.sessionId);
        await this.qrSweepRepo.updateRemoteStart(session.id, nextAttempt, new Date(Date.now() + REMOTE_START_TIMEOUT_MS));
      } catch (err: any) {
        this.logger.error(`Sweeper error for session ${session.sessionId}: ${err.message}`);
      }
    }
  }

  private async dispatchRemoteStart(chargerId: string, connectorId: number | null, idTag: string | null): Promise<void> {
    await this.redisService
      .publish(
        OCPP_COMMAND_REQUEST_CHANNEL,
        JSON.stringify({ correlationId: randomUUID(), chargerId, action: 'RemoteStartTransaction', payload: { connectorId, idTag }, fireAndForget: true }),
      )
      .catch(() => undefined);
  }

  /** Mirrors the sweeper's calls into `refundPayAndChargeAmount(session, null, session.maxAmount, reason)`. */
  private async publishRefund(session: any, reason: string): Promise<void> {
    if (session.paymentTransactionId == null) return;

    const payload: QrRefundRequestPayload = {
      sessionRowId: session.id,
      paymentTransactionId: session.paymentTransactionId,
      clientId: session.clientId,
      sessionCode: session.sessionId,
      referenceId: session.sessionId,
      refundAmount: Number(session.maxAmount || 0),
      reason,
      newStatus: 'Failed',
    };
    await this.redisService.publish(QR_REFUND_REQUEST_CHANNEL, JSON.stringify(payload));
  }
}
