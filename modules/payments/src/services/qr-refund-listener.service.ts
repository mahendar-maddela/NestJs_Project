import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RedisService } from '@app/redis';
import { QR_REFUND_REQUEST_CHANNEL, QrRefundRequestPayload } from '@app/common';
import { PayChargeQrRepository } from '../repositories/pay-charge-qr.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import { RazorpayAdapter } from '@integrations/razorpay';

/**
 * Listens for one-way QR-refund requests published by apps/ocpp-gateway (session stop, leftover balance)
 * and apps/scheduler (sweeper, RemoteStart attempts exhausted). apps/api is the only process that holds
 * Razorpay/PaymentConfig access, so the actual refund always executes here. Mirrors
 * `OCPP/payAndChargeFeature/payAndChargeHandler.js:refundPayAndChargeAmount`.
 */
@Injectable()
export class QrRefundListenerService implements OnModuleInit {
  private readonly logger = new Logger(QrRefundListenerService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly qrRepo: PayChargeQrRepository,
    private readonly paymentRepo: PaymentRepository,
    private readonly razorpayAdapter: RazorpayAdapter,
  ) {}

  onModuleInit(): void {
    // Queued and auto-(re)subscribed by RedisService if Redis isn't ready yet — no raw
    // "Connection is closed" errors when Redis is down at startup.
    this.redisService.subscribe(QR_REFUND_REQUEST_CHANNEL, (channel, message) => {
      this.handleRequest(message).catch((err) => this.logger.error(`QR refund handling failed: ${err.message}`));
    });
  }

  private async handleRequest(raw: string): Promise<void> {
    let payload: QrRefundRequestPayload;
    try {
      payload = JSON.parse(raw);
    } catch {
      this.logger.warn('Received malformed QR refund request');
      return;
    }

    await this.refund(payload);
  }

  /** Mirrors `refundPayAndChargeAmount`. */
  private async refund(payload: QrRefundRequestPayload): Promise<void> {
    const { sessionRowId, paymentTransactionId, clientId, referenceId, refundAmount, reason, newStatus } = payload;

    const payment = await this.qrRepo.findPaymentTransactionForRefund(paymentTransactionId);
    if (!payment) {
      this.logger.warn(`No payment found for session row ${sessionRowId}, cannot refund`);
      return;
    }

    const paymentConfig = await this.paymentRepo.findPaymentConfig(clientId);
    if (!paymentConfig) {
      this.logger.warn(`No payment config for client ${clientId}, cannot refund`);
      return;
    }

    if ((paymentConfig.provider || '').toLowerCase() !== 'razorpay') {
      return;
    }

    try {
      const refundResponse = await this.razorpayAdapter.refundPayment(
        payment.paymentId as string,
        {
          amount: refundAmount,
          receipt: `Receipt No. ${referenceId}`,
          notes: { notes_key_1: `Refund for ${payment.paymentId} session ${referenceId}` },
        },
        { keyId: paymentConfig.keyId as string, keySecret: paymentConfig.secretToken as string },
      );

      await this.qrRepo.applyRefund(payment.id, refundResponse.id, refundAmount, sessionRowId, reason, newStatus);
    } catch (error: any) {
      const errMsg = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
      this.logger.warn(`Refund error for session row ${sessionRowId}: ${errMsg}`);
    }
  }
}
