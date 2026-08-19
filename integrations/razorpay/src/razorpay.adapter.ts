import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import RazorpaySdk = require('razorpay');
import {
  InitiatePaymentResult, PaymentGatewayAdapter, PaymentGatewayCredentials,
  VerifyWebhookSignatureOptions
} from 'modules/payments/src/payment-gateway.interface';

/** Mirrors legacy's per-request `new Razorpay({ key_id, key_secret })` in `controllers/APP/paymentGatewayController.js` / `controllers/Fleet/paymentTransactions.js`. */
@Injectable()
export class RazorpayAdapter implements PaymentGatewayAdapter {
  private readonly logger = new Logger(RazorpayAdapter.name);

  async initiatePayment(
    amount: number,
    currency: string = 'INR',
    description: string = 'Nexin Wallet Recharge',
    credentials?: PaymentGatewayCredentials,
    metadata?: Record<string, unknown>,
  ): Promise<InitiatePaymentResult> {
    if (!credentials) {
      throw new Error('Razorpay credentials are required to create a live order');
    }

    const instance = new RazorpaySdk({ key_id: credentials.keyId, key_secret: credentials.keySecret });
    const order = await instance.orders.create({
      amount: Math.round(amount * 100),
      currency,
      receipt: `receipt_${Date.now()}`,
      notes: metadata as Record<string, string> | undefined,
    });

    this.logger.log(`Created Razorpay order ${order.id} for amount ${amount} ${currency}`);

    return {
      orderId: order.id,
      amount: Number(order.amount),
      currency: String(order.currency),
      provider: 'Razorpay',
      rawResponse: order as unknown as Record<string, unknown>,
    };
  }

  verifyWebhookSignature(options: VerifyWebhookSignatureOptions): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', options.secret)
      .update(options.rawBody)
      .digest('hex');

    if (expectedSignature.length !== options.signature.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(options.signature));
  }

  /** Mirrors `controllers/admin/payAndCharge/qr.controller.js:createQrCodeForPayAndCharge`'s `qrCode.create`. Razorpay-specific (static reusable UPI QR codes) — not part of the generic PaymentGatewayAdapter interface. */
  async createQrCode(
    options: { name: string; description: string; notes?: Record<string, string> },
    credentials: PaymentGatewayCredentials,
  ): Promise<{ id: string; imageUrl: string }> {
    const instance = new RazorpaySdk({ key_id: credentials.keyId, key_secret: credentials.keySecret });
    const qr = await instance.qrCode.create({
      type: 'upi_qr',
      usage: 'multiple_use',
      fixed_amount: false,
      name: options.name,
      description: options.description,
      notes: options.notes,
    });
    return { id: qr.id, imageUrl: qr.image_url };
  }

  /** Mirrors `qr.controller.js:downloadQrCodeForPayAndCharge` / `createQrCodeForPayAndCharge`'s `qrCode.fetch`. Throws if the QR code no longer exists on Razorpay's side. */
  async fetchQrCode(qrProviderId: string, credentials: PaymentGatewayCredentials): Promise<{ id: string; imageUrl: string }> {
    const instance = new RazorpaySdk({ key_id: credentials.keyId, key_secret: credentials.keySecret });
    const qr = await instance.qrCode.fetch(qrProviderId);
    return { id: qr.id, imageUrl: qr.image_url };
  }

  /** Mirrors `payAndChargeHandler.js:refundPayAndChargeAmount`'s `payments.refund`. */
  async refundPayment(
    paymentId: string,
    options: { amount: number; receipt: string; notes?: Record<string, string> },
    credentials: PaymentGatewayCredentials,
  ): Promise<{ id: string }> {
    const instance = new RazorpaySdk({ key_id: credentials.keyId, key_secret: credentials.keySecret });
    const refund = await instance.payments.refund(paymentId, {
      amount: Math.round(options.amount * 100),
      speed: 'optimum',
      receipt: options.receipt,
      notes: options.notes,
    });
    return { id: refund.id };
  }
}
