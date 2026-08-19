import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { IsNull } from 'typeorm';
import { amountToEnergyConversion } from '@app/common';
import { PayChargeQrRepository } from '../repositories/pay-charge-qr.repository';
import { ChargerCommandService } from '../../../chargers/src/services/charger-command.service';

export interface QrWebhookResult {
  status: number;
  body: { success: boolean; message: string };
}

const REMOTE_START_TIMEOUT_MS = 30000;

/** Mirrors `OCPP/payAndChargeFeature/payAndChargeHandler.js:handlePayAndChargeWebhook` + `sendRemoteStart`. */
@Injectable()
export class QrPayChargeWebhookService {
  private readonly logger = new Logger(QrPayChargeWebhookService.name);

  constructor(
    private readonly qrRepo: PayChargeQrRepository,
    private readonly chargerCommandService: ChargerCommandService,
  ) {}

  async processWebhook(payload: Record<string, any>, brandName: string): Promise<QrWebhookResult> {
    if (payload?.event !== 'qr_code.credited') {
      this.logger.warn(`QR PAYMENT Unknown event: ${payload?.event}`);
      return { status: 200, body: { success: true, message: 'Webhook processed successfully' } };
    }

    const payment = payload.payload?.payment?.entity;
    const qrEntity = payload.payload?.qr_code?.entity;
    if (!payment || !qrEntity) {
      return { status: 400, body: { success: false, message: 'Invalid webhook payload' } as any };
    }

    const { amount, currency, order_id: orderId, invoice_id: invoiceId, method, vpa, email, contact } = payment;
    const qrId = qrEntity.id;
    const receivedAmount = amount / 100;

    const existing = await this.qrRepo.findPaymentByPaymentId(payment.id);
    if (existing) {
      return { status: 200, body: { success: true, message: 'Already processed' } };
    }

    const qrLookup = await this.qrRepo.findQrCodeWithChargerByProviderId(qrId);
    if (!qrLookup) {
      this.logger.error(`QR ${qrId} not found`);
      return { status: 404, body: { success: false, message: 'QR not found' } };
    }

    const { connector, charger } = qrLookup;
    const paidUser = contact || vpa;
    const paidUserEmail = email;

    const created = await this.qrRepo.runInTransaction(async (repos) => {
      const paymentTransaction = (await repos.paymentTransaction.save(
        repos.paymentTransaction.create({
          paymentId: payment.id,
          amount: receivedAmount,
          orderId,
          providerQrId: qrId,
          paymentType: method,
          transactionType: 'Credit',
          status: 'Success',
          currency,
          description: 'QRPAYMENT',
          type: 'QRUser',
          paidUser,
          paidUserEmail,
          hook: brandName,
          webhook: payload,
          provider: 'Razorpay',
          paymentPurpose: 'PayAndCharge',
          clientId: charger.clientId,
        } as any),
      )) as any;

      let requiredPrice: { price: number | null; gst: number | null } | null = await repos.roamingTariff.findOne({
        where: { chargerId: charger.id, clientId: charger.clientId, tariffType: 'QRPAY', importClientId: IsNull(), emspId: IsNull() },
      });

      if (!requiredPrice) {
        requiredPrice = await repos.tariff.findOne({
          where: { vendorId: charger.vendorId as number, chargerId: charger.id, userTypeId: IsNull() },
        });
      }

      if (!requiredPrice) {
        this.logger.error(`Tariff for ${charger.chargerId} not found in either table`);
        return null;
      }

      const payableAmount = Number(receivedAmount);
      const energyCalc = amountToEnergyConversion(payableAmount, requiredPrice.gst || 0, requiredPrice.price || 0, true);

      const prefixConfigValue = await repos.prefixConfig.findOne({ where: { clientId: charger.clientId }, select: { session: true } });
      const sessionId = `${prefixConfigValue?.session ?? ''}${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

      const chargingSession = (await repos.chargingSession.save(
        repos.chargingSession.create({
          sessionId,
          status: 'Initiated',
          maxEnergy: energyCalc,
          maxAmount: payableAmount,
          connectorId: Number(connector.connectorId),
          chargerId: charger.chargerId,
          chargerRef: charger.id,
          platform: 'QRPAY',
          calcTaxPercent: requiredPrice.gst || 0,
          calcPrice: requiredPrice.price || 0,
          tariffName: 'QR_PAYMENT_TARIFF',
          clientId: charger.clientId,
          maxChargingPercentage: null,
          startFrom: 'QRPAY',
          paymentTransactionId: paymentTransaction.id,
          remoteStartAttempts: 0,
        } as any),
      )) as any;

      return { charger, session: chargingSession, connectorId: Number(connector.connectorId) };
    });

    if (!created) {
      return { status: 404, body: { success: false, message: 'Price not found' } };
    }

    await this.sendRemoteStart(created.charger.chargerId, created.session.id, created.session.sessionId as string, created.connectorId, 1);

    return { status: 200, body: { success: true, message: 'Webhook processed successfully' } };
  }

  /** Mirrors `sendRemoteStart`: dispatches RemoteStartTransaction and records the attempt/next-sweep time on the session row. */
  async sendRemoteStart(chargerId: string, sessionRowId: number, sessionId: string, connectorId: number, attempt: number): Promise<void> {
    await this.chargerCommandService.sendFireAndForgetCommand(chargerId, 'RemoteStartTransaction', { connectorId, idTag: sessionId }).catch(() => undefined);
    await this.qrRepo.updateChargingSessionRemoteStart(sessionRowId, attempt, new Date(Date.now() + REMOTE_START_TIMEOUT_MS));
  }
}
