import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentRepository } from '../repositories/payment.repository';
import { RazorpayAdapter } from '@integrations/razorpay';

/** Mirrors `controllers/Web/paymentTransactionController.js:getAllPayments` and `controllers/APP/paymentGatewayController.js:createRazorpayOrder`. Shared by the web and app (driver) actors. */
@Injectable()
export class UserPaymentService {
  constructor(
    private readonly repo: PaymentRepository,
    private readonly razorpayAdapter: RazorpayAdapter,
  ) {}

  async getAllPayments(userId: number, clientId: number, page: number, limit: number) {
    const [rows, count] = await this.repo.findAndCountByUser(userId, clientId, (page - 1) * limit, limit);

    return {
      success: true,
      message: 'Payments fetched successfully',
      data: rows,
      pagination: { totalPages: Math.ceil(count / limit), page },
    };
  }

  async createRazorpayOrder(userId: number, clientId: number, amount: number, couponId?: number) {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      throw new BadRequestException({ success: false, message: 'Invalid amount' });
    }

    if (couponId) {
      const alreadyUsed = await this.repo.findSuccessfulByUserCoupon(userId, couponId, clientId);
      if (alreadyUsed) {
        throw new BadRequestException({ success: false, message: 'Coupon already used by this user in an active transaction' });
      }
    }

    const paymentConfig = await this.repo.findPaymentConfig(clientId);
    if (!paymentConfig) {
      throw new BadRequestException({ success: false, message: 'Payment configuration not found' });
    }

    const clientDetails = await this.repo.findClientBillingDetails(clientId);

    let order;
    try {
      order = await this.razorpayAdapter.initiatePayment(Number(amount), 'INR', 'Add Funds to Wallet', {
        keyId: paymentConfig.keyId as string,
        keySecret: paymentConfig.secretToken as string,
      });
    } catch (error: any) {
      throw new BadRequestException({ message: error?.error?.description || error?.message || 'Failed to create Razorpay order' });
    }

    const wallet = await this.repo.findWalletForUser(userId, clientId);

    await this.repo.createTransaction({
      orderId: order.orderId,
      amount: Number(amount),
      walletId: wallet!.id,
      currency: 'INR',
      transactionType: 'Credit',
      status: 'Pending',
      userId,
      couponId: couponId || null,
      type: 'User',
      clientId,
    });

    return {
      success: true,
      message: 'Razorpay order created successfully',
      data: {
        orderId: order.orderId,
        currency: order.currency,
        amount: order.amount,
        keyId: paymentConfig.keyId,
        companyName: clientDetails?.brandName || 'PVT.LTD',
        logoUrl: clientDetails?.logoUrl || '',
        description: 'Add Funds to Wallet',
      },
    };
  }
}
