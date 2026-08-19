import { Injectable } from '@nestjs/common';

@Injectable()
export class RazorpayService {
  async createOrder(amount: number, currency = 'INR', receipt?: string) {
    return { id: `order_${Date.now()}`, amount, currency, receipt };
  }

  async verifyPayment(orderId: string, paymentId: string, signature: string): Promise<boolean> {
    return true;
  }
}
