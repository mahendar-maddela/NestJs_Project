import { Injectable, Logger } from '@nestjs/common';
import { Not } from 'typeorm';
import { PaymentRepository, PaymentSettlementRepos } from '../repositories/payment.repository';
import { PaymentTransaction } from '../entities/payment-transaction.entity';

export interface WebhookResult {
  status: number;
  body: { success: boolean; message: string };
}

function generateSevenDigit(): number {
  return Math.floor(1000000 + Math.random() * 9000000);
}

/** Mirrors `controllers/APP/paymentGatewayController.js:verifyPaymentTransaction` (wallet credit / coupon cashback settlement for the Razorpay webhook). */
@Injectable()
export class PaymentWebhookService {
  private readonly logger = new Logger(PaymentWebhookService.name);

  constructor(private readonly paymentRepo: PaymentRepository) {}

  async processPaymentWebhook(payment: any, hookParam: string): Promise<WebhookResult> {
    return this.paymentRepo.runInTransaction(async (repos) => {
      const orderId = payment.order_id;
      const paymentId = payment.id;
      const paymentStatus = payment.status;

      const transaction = await repos.paymentTransaction.findOne({ where: { orderId } });
      if (!transaction) {
        return { status: 404, body: { success: false, message: 'Transaction not found' } };
      }

      if (transaction.status === 'Success' && transaction.paymentId === paymentId) {
        return { status: 200, body: { success: true, message: 'Transaction already processed' } };
      }

      if (paymentStatus === 'captured') {
        if (transaction.userId) {
          await this.settleUserPayment(repos, transaction, payment, hookParam, paymentId);
        } else if (transaction.fleetId) {
          await this.settleFleetPayment(repos, transaction, payment, hookParam, paymentId);
        }
      } else if (paymentStatus === 'failed') {
        transaction.status = 'Failed';
        transaction.paymentType = payment.method;
        transaction.description = payment.description;
        transaction.hook = hookParam;
        transaction.utr = payment.acquirer_data?.bank_transaction_id || payment.acquirer_data?.rrn || null;
        transaction.paymentId = paymentId || '';
        transaction.paidUserEmail = payment.email || null;
        transaction.paidUser = payment.contact || payment.vpa || null;
        await repos.paymentTransaction.save(transaction);
      }

      return { status: 200, body: { success: true, message: 'Webhook received & payment processed' } };
    });
  }

  private applyCommonPaymentFields(transaction: PaymentTransaction, payment: any, hookParam: string, paymentId: string) {
    transaction.status = 'Success';
    transaction.paymentId = paymentId;
    transaction.paymentType = payment.method;
    transaction.description = payment.description;
    transaction.hook = hookParam;
    transaction.paidUserEmail = payment.email || null;
    transaction.paidUser = payment.contact || payment.vpa || null;
    transaction.utr = payment.acquirer_data?.bank_transaction_id || payment.acquirer_data?.rrn || null;
  }

  private async findActiveCoupon(repos: PaymentSettlementRepos, couponId: number) {
    const today = new Date().toISOString().split('T')[0];
    return repos.coupon
      .createQueryBuilder('c')
      .where('c.id = :id', { id: couponId })
      .andWhere('DATE(c.startDate) <= :today', { today })
      .andWhere('DATE(c.endDate) >= :today', { today })
      .getRawOne();
  }

  private calculateCashback(rechargeAmount: number, coupon: { amount: number | null; cashbackPercent: number | null; maxCashbackAmount: number | null }): number {
    if (coupon.amount == null || rechargeAmount < coupon.amount) return 0;
    const calculatedCashback = Number((((rechargeAmount * (coupon.cashbackPercent || 0)) / 100).toFixed(2))) || 0;
    return coupon.maxCashbackAmount ? Math.min(calculatedCashback, coupon.maxCashbackAmount) : calculatedCashback;
  }

  private async generateUniqueWalletRefNo(repos: PaymentSettlementRepos, clientId: number, actorId: number): Promise<string> {
    const clientPrefix = await repos.prefixConfig.findOne({ where: { clientId }, select: { wallet: true } });

    let refNo: string;
    let exists = true;
    do {
      refNo = `${clientPrefix?.wallet}${actorId}${generateSevenDigit()}`;
      exists = (await repos.walletTransaction.findOne({ where: { refNo }, select: { id: true, refNo: true } })) !== null;
    } while (exists);

    return refNo;
  }

  private async settleUserPayment(repos: PaymentSettlementRepos, transaction: PaymentTransaction, payment: any, hookParam: string, paymentId: string) {
    this.applyCommonPaymentFields(transaction, payment, hookParam, paymentId);
    await repos.paymentTransaction.save(transaction);

    let wallet = await repos.wallet.findOne({ where: { userId: transaction.userId as number, type: 'User' } });
    if (!wallet) {
      wallet = await repos.wallet.save(repos.wallet.create({ userId: transaction.userId, balance: 0, type: 'User', clientId: transaction.clientId }));
    }
    wallet.balance = (wallet.balance || 0) + Number(transaction.amount);

    let cashback = 0;
    if (transaction.couponId) {
      const alreadyUsed = await repos.paymentTransaction.findOne({
        where: { id: Not(transaction.id), userId: transaction.userId as number, couponId: transaction.couponId, status: 'Success' as any },
      });
      if (!alreadyUsed) {
        const coupon = await this.findActiveCoupon(repos, transaction.couponId);
        if (coupon) {
          cashback = this.calculateCashback(Number(transaction.amount), coupon);
          wallet.balance += cashback;
        }
      }
    }

    await repos.wallet.save(wallet);

    const refNo = await this.generateUniqueWalletRefNo(repos, transaction.clientId, transaction.userId as number);
    await repos.walletTransaction.save(
      repos.walletTransaction.create({
        walletId: wallet.id,
        amount: transaction.amount,
        type: 'Credit',
        refNo,
        remainingBalance: wallet.balance - cashback,
        transactionPurpose: 'Credits',
        sourceType: 'Wallet',
        paymentTransactionId: transaction.id,
        userType: 'User',
        clientId: transaction.clientId,
      }),
    );

    if (cashback > 0) {
      await repos.walletTransaction.save(
        repos.walletTransaction.create({
          walletId: wallet.id,
          amount: cashback,
          type: 'Credit',
          refNo: `${refNo}CB`,
          remainingBalance: wallet.balance,
          transactionPurpose: 'Cashback',
          sourceType: 'Coupon',
          userType: 'User',
          clientId: transaction.clientId,
        }),
      );
    }
  }

  private async settleFleetPayment(repos: PaymentSettlementRepos, transaction: PaymentTransaction, payment: any, hookParam: string, paymentId: string) {
    this.applyCommonPaymentFields(transaction, payment, hookParam, paymentId);
    await repos.paymentTransaction.save(transaction);

    let wallet = await repos.wallet.findOne({ where: { fleetId: transaction.fleetId as number, type: 'Fleet' } });
    if (!wallet) {
      wallet = await repos.wallet.save(repos.wallet.create({ fleetId: transaction.fleetId, balance: 0, type: 'Fleet', clientId: transaction.clientId }));
    }
    wallet.balance = (wallet.balance || 0) + Number(transaction.amount);

    let cashback = 0;
    if (transaction.couponId) {
      const coupon = await this.findActiveCoupon(repos, transaction.couponId);
      if (coupon) {
        cashback = this.calculateCashback(Number(transaction.amount), coupon);
        wallet.balance += cashback;
      }
    }

    await repos.wallet.save(wallet);

    const refNo = await this.generateUniqueWalletRefNo(repos, transaction.clientId, transaction.fleetId as number);
    await repos.walletTransaction.save(
      repos.walletTransaction.create({
        walletId: wallet.id,
        amount: transaction.amount,
        type: 'Credit',
        refNo,
        remainingBalance: wallet.balance - cashback,
        transactionPurpose: 'Credits',
        sourceType: 'Wallet',
        paymentTransactionId: transaction.id,
        userType: 'Fleet',
        clientId: transaction.clientId,
      }),
    );

    if (cashback > 0) {
      await repos.walletTransaction.save(
        repos.walletTransaction.create({
          walletId: wallet.id,
          amount: cashback,
          type: 'Credit',
          refNo: `${refNo}CB`,
          remainingBalance: wallet.balance,
          transactionPurpose: 'Cashback',
          sourceType: 'Coupon',
          userType: 'Fleet',
          clientId: transaction.clientId,
        }),
      );
    }
  }
}
