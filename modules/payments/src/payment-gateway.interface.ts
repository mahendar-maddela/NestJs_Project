export interface InitiatePaymentResult {
  orderId: string;
  amount: number;
  currency: string;
  provider: 'Razorpay' | 'PhonePe' | 'Zoho';
  checkoutUrl?: string;
  rawResponse?: Record<string, unknown>;
}

export interface VerifyWebhookSignatureOptions {
  rawBody: string | Buffer;
  signature: string;
  secret: string;
}

export interface PaymentGatewayCredentials {
  keyId: string;
  keySecret: string;
}

export interface PaymentGatewayAdapter {
  initiatePayment(
    amount: number,
    currency: string,
    description: string,
    credentials?: PaymentGatewayCredentials,
    metadata?: Record<string, unknown>,
  ): Promise<InitiatePaymentResult>;
  verifyWebhookSignature(options: VerifyWebhookSignatureOptions): boolean;
}
