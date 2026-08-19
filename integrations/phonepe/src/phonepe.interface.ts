export interface PhonePePaymentOptions {
  merchantTransactionId: string;
  amount: number;
  redirectUrl: string;
  callbackUrl?: string;
}
