import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentRepository } from '../../../payments/src/repositories/payment.repository';
import { RazorpayAdapter } from '@integrations/razorpay';

/** Mirrors `controllers/Fleet/paymentTransactions.js`. */
@Injectable()
export class FleetPaymentService {
  constructor(
    private readonly repo: PaymentRepository,
    private readonly razorpayAdapter: RazorpayAdapter,
  ) {}

  async getAllPaymentTransactions(fleetId: number, clientId: number, page: number, limit: number) {
    const [rows, count] = await this.repo.findAndCountByFleet(fleetId, clientId, (page - 1) * limit, limit);

    return {
      success: true,
      message: 'Payments fetched successfully',
      data: rows,
      pagination: { totalPages: Math.ceil(count / limit), page },
    };
  }

  async createFleetRazorpayOrder(fleetId: number, clientId: number, amount: number, couponId?: number) {
    if (!amount || amount < 100) {
      throw new BadRequestException({ success: false, message: 'Minimum recharge amount is ₹100' });
    }

    if (couponId) {
      const alreadyUsed = await this.repo.findSuccessfulByFleetCoupon(fleetId, couponId, clientId);
      if (alreadyUsed) {
        throw new BadRequestException({ success: false, message: 'Coupon already used by this user in an active transaction' });
      }
    }

    const paymentConfig = await this.repo.findPaymentConfig(clientId);
    if (!paymentConfig) {
      throw new BadRequestException({ success: false, message: 'Payment configuration not found' });
    }

    // Legacy swallows the Razorpay order-creation error here and crashes later on `order.id` (no `return` after the catch) —
    // net effect is an unhandled 500 with no PaymentTransaction persisted. Left uncaught to reproduce that same outcome.
    const order = await this.razorpayAdapter.initiatePayment(Number(amount), 'INR', 'Add Funds to Wallet', {
      keyId: paymentConfig.keyId as string,
      keySecret: paymentConfig.secretToken as string,
    });

    const wallet = await this.repo.findWalletForFleet(fleetId);

    await this.repo.createTransaction({
      orderId: order.orderId,
      amount: Number(amount),
      walletId: wallet!.id,
      currency: 'INR',
      transactionType: 'Credit',
      status: 'Pending',
      fleetId,
      couponId: couponId || null,
      type: 'Fleet',
      clientId,
    });

    const clientDetails = await this.repo.findClientBillingDetails(clientId);

    return {
      success: true,
      message: 'Razorpay order created successfully',
      data: {
        orderId: order.orderId,
        currency: order.currency,
        amount: order.amount,
        keyId: paymentConfig.keyId,
        companyName: clientDetails?.companyName || 'PVT.LTD',
        logoUrl: clientDetails?.logoUrl || '',
        description: 'Add Funds to Wallet',
      },
    };
  }
}
