import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentRepository } from '../repositories/payment.repository';
import { PayChargeQrRepository } from '../repositories/pay-charge-qr.repository';
import { RazorpayAdapter } from '@integrations/razorpay';

/** Mirrors `controllers/admin/payAndCharge/qr.controller.js`. */
@Injectable()
export class AdminPayChargeQrService {
  constructor(
    private readonly paymentRepo: PaymentRepository,
    private readonly qrRepo: PayChargeQrRepository,
    private readonly razorpayAdapter: RazorpayAdapter,
  ) {}

  async createQrCodeForPayAndCharge(clientId: number, chargerId: number, price: number, gst: number) {
    if (!chargerId || !price || !gst) {
      throw new BadRequestException({ message: 'Missing required fields' });
    }

    const charger = await this.qrRepo.findChargerWithConnectors(chargerId, clientId);
    if (!charger) {
      throw new NotFoundException({ message: 'Charger not found' });
    }
    if (!charger.connectors || charger.connectors.length === 0) {
      throw new NotFoundException({ message: 'Connector not found' });
    }

    const paymentConfig = await this.paymentRepo.findPaymentConfig(clientId);
    if (!paymentConfig) {
      throw new BadRequestException({ success: false, message: 'Payment configuration not found' });
    }

    const existingTariff = await this.qrRepo.findQrTariff(charger.id, clientId);
    await this.qrRepo.upsertQrTariff(existingTariff, charger.id, charger.vendorId, clientId, price, gst);

    if ((paymentConfig.provider || '').toLowerCase() === 'razorpay') {
      const credentials = { keyId: paymentConfig.keyId as string, keySecret: paymentConfig.secretToken as string };

      try {
        for (const connector of charger.connectors) {
          let qrRecord = await this.qrRepo.findQrCodeRecord(clientId, charger.id, connector.id);

          if (!qrRecord || qrRecord.qrProvider?.toLowerCase() !== paymentConfig.provider!.toLowerCase()) {
            const qrResponse = await this.razorpayAdapter.createQrCode(
              {
                name: `Charger ${charger.chargerId} Connector ${connector.connectorId}`,
                description: `Pay & Charge - Charger ${charger.chargerId}, Connector ${connector.connectorId}`,
                notes: { purpose: `Pay and charge Charger ${charger.chargerId} Connector ${connector.connectorId}` },
              },
              credentials,
            );

            if (qrRecord) {
              qrRecord.qrProvider = paymentConfig.provider;
              qrRecord.qrProviderId = qrResponse.id;
              qrRecord.status = 'ACTIVE';
              await this.qrRepo.saveQrCodeRecord(qrRecord);
            } else {
              await this.qrRepo.createQrCodeRecord({
                qrProvider: paymentConfig.provider,
                clientId,
                chargerId: charger.id,
                connectorId: connector.id,
                qrProviderId: qrResponse.id,
                status: 'ACTIVE',
              });
            }
          } else {
            try {
              await this.razorpayAdapter.fetchQrCode(qrRecord.qrProviderId as string, credentials);
              continue;
            } catch {
              const qrResponse = await this.razorpayAdapter.createQrCode(
                {
                  name: `Charger ${charger.chargerId} Connector ${connector.connectorId}`,
                  description: `Pay & Charge - Charger ${charger.chargerId}, Connector ${connector.connectorId}`,
                  notes: { purpose: `Pay and charge Charger ${charger.chargerId} Connector ${connector.connectorId}` },
                },
                credentials,
              );
              qrRecord.qrProviderId = qrResponse.id;
              qrRecord.status = 'ACTIVE';
              await this.qrRepo.saveQrCodeRecord(qrRecord);
            }
          }
        }
      } catch (error: any) {
        throw new BadRequestException({ message: error?.error?.description || error?.message || 'Failed to create QR code' });
      }
    }

    return { message: 'Qr code created successfully' };
  }

  async downloadQrCodeForPayAndCharge(clientId: number, chargerId: number, connectorId: number, qrProviderId: string) {
    const paymentConfig = await this.paymentRepo.findPaymentConfig(clientId);
    if (!paymentConfig) {
      throw new BadRequestException({ success: false, message: 'Payment configuration not found' });
    }

    let data: string | null = null;

    if ((paymentConfig.provider || '').toLowerCase() === 'razorpay') {
      const credentials = { keyId: paymentConfig.keyId as string, keySecret: paymentConfig.secretToken as string };

      try {
        const chargeQRCode = await this.qrRepo.findQrCodeForDownload(clientId, chargerId, connectorId, qrProviderId);
        const qrResponse = await this.razorpayAdapter.fetchQrCode(chargeQRCode!.qrProviderId as string, credentials);
        data = qrResponse.imageUrl;
      } catch (error: any) {
        throw new BadRequestException({ message: error?.message || error });
      }
    }

    return { success: true, message: 'QR code download successfully', data };
  }
}
