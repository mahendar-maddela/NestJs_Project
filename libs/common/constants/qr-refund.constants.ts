export const QR_REFUND_REQUEST_CHANNEL = 'qr:refund:request';

/** One-way message: apps/ocpp-gateway (session stop) or apps/scheduler (sweeper, attempts exhausted) asks
 *  apps/api — the only process holding Razorpay/PaymentConfig access — to refund leftover QR pay-and-charge balance.
 *  Mirrors the inputs `OCPP/payAndChargeFeature/payAndChargeHandler.js:refundPayAndChargeAmount` needs. */
export interface QrRefundRequestPayload {
  sessionRowId: number;
  paymentTransactionId: number;
  clientId: number;
  sessionCode: string | null;
  referenceId: string;
  refundAmount: number;
  reason: string;
  newStatus: string;
}
