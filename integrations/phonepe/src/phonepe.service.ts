import { Injectable } from '@nestjs/common';

@Injectable()
export class PhonePeService {
  async initiatePayment(merchantTransactionId: string, amount: number, redirectUrl: string) {
    return { success: true, redirectUrl, merchantTransactionId };
  }
}
