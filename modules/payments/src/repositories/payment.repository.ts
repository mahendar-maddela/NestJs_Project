import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Not, Repository } from 'typeorm';
import { PaymentTransaction } from '../entities/payment-transaction.entity';
import { PaymentConfig } from '../entities/payment-config.entity';
import { ClientDetails } from '../../../clients/src/entities/client-details.entity';
import { Wallet } from '../../../wallet/src/entities/wallet.entity';
import { WalletTransaction } from '../../../wallet/src/entities/wallet-transaction.entity';
import { Coupon } from '../../../users/src/entities/coupon.entity';
import { PrefixConfig } from '../../../clients/src/entities/prefix-config.entity';

export interface PaymentSettlementRepos {
  paymentTransaction: Repository<PaymentTransaction>;
  wallet: Repository<Wallet>;
  walletTransaction: Repository<WalletTransaction>;
  coupon: Repository<Coupon>;
  prefixConfig: Repository<PrefixConfig>;
}

@Injectable()
export class PaymentRepository {
  constructor(
    @InjectRepository(PaymentTransaction)
    private readonly paymentTransactionRepo: Repository<PaymentTransaction>,
    @InjectRepository(PaymentConfig)
    private readonly paymentConfigRepo: Repository<PaymentConfig>,
    @InjectRepository(ClientDetails)
    private readonly clientDetailsRepo: Repository<ClientDetails>,
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /** Mirrors `controllers/APP/paymentGatewayController.js:createRazorpayOrder`'s `PaymentConfig` lookup (also used by Fleet). */
  findPaymentConfig(clientId: number) {
    return this.paymentConfigRepo.findOne({ where: { clientId } });
  }

  /** Mirrors the `ClientDetails` lookup shared by App/Web (`companyName`,`brandName`,`logoUrl`) and Fleet (`companyName`,`logoUrl`) order-creation. */
  findClientBillingDetails(clientId: number) {
    return this.clientDetailsRepo.findOne({ where: { clientId }, select: { companyName: true, brandName: true, clientId: true, logoUrl: true } });
  }

  /** Mirrors App/Web `createRazorpayOrder`'s `Wallet.findOne({where:{userId, type:"User", clientId}})`. */
  findWalletForUser(userId: number, clientId: number) {
    return this.walletRepo.findOne({ where: { userId, type: 'User', clientId } });
  }

  /** Mirrors Fleet `createFleetRazorpayOrder`'s `Wallet.findOne({where:{fleetId, type:"Fleet"}})` (intentionally not clientId-scoped, matching legacy). */
  findWalletForFleet(fleetId: number) {
    return this.walletRepo.findOne({ where: { fleetId, type: 'Fleet' } });
  }

  /** Mirrors `controllers/Fleet/paymentTransactions.js:createFleetRazorpayOrder`'s coupon-already-used check. */
  async findSuccessfulByFleetCoupon(fleetId: number, couponId: number, clientId: number): Promise<boolean> {
    const count = await this.paymentTransactionRepo.count({ where: { fleetId, couponId, status: 'Success' as any, clientId } });
    return count > 0;
  }

  /** Wraps the webhook settlement (wallet credit, coupon cashback, WalletTransaction insert) in a single DB transaction, mirroring `verifyPaymentTransaction`'s `sequelize.transaction()`. */
  runInTransaction<T>(work: (repos: PaymentSettlementRepos) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(async (manager) => {
      return work({
        paymentTransaction: manager.getRepository(PaymentTransaction),
        wallet: manager.getRepository(Wallet),
        walletTransaction: manager.getRepository(WalletTransaction),
        coupon: manager.getRepository(Coupon),
        prefixConfig: manager.getRepository(PrefixConfig),
      });
    });
  }

  async findTransactionById(id: number) {
    return this.paymentTransactionRepo.findOne({ where: { id } });
  }

  async findTransactionByOrderId(orderId: string) {
    return this.paymentTransactionRepo.findOne({ where: { orderId } });
  }

  async createTransaction(data: Partial<PaymentTransaction>) {
    return this.paymentTransactionRepo.save(this.paymentTransactionRepo.create(data));
  }

  async updateTransaction(id: number, data: Partial<PaymentTransaction>) {
    await this.paymentTransactionRepo.update(id, data as any);
    return this.paymentTransactionRepo.findOne({ where: { id } });
  }

  async updateTransactionByOrderId(orderId: string, data: Partial<PaymentTransaction>) {
    return this.paymentTransactionRepo.update({ orderId }, data as any);
  }

  /** Mirrors `controllers/APP/couponController.js:getAllActiveCoupons` (per-coupon usage check). */
  async findSuccessfulByUserCoupon(userId: number, couponId: number, clientId: number): Promise<boolean> {
    const count = await this.paymentTransactionRepo.count({ where: { userId, couponId, status: 'Success' as any, clientId } });
    return count > 0;
  }

  /** Mirrors `controllers/Fleet/paymentTransactions.js:getAllPaymentTransactions`. */
  async findAndCountByFleet(fleetId: number, clientId: number, skip: number, take: number) {
    return this.paymentTransactionRepo.findAndCount({
      where: { fleetId, clientId, status: Not('Pending') as any },
      order: { id: 'DESC' },
      skip,
      take,
    });
  }

  /** Mirrors `controllers/Web/paymentTransactionController.js:getAllPayments`. Shared by the web and app (driver) actors. */
  async findAndCountByUser(userId: number, clientId: number, skip: number, take: number) {
    return this.paymentTransactionRepo.findAndCount({
      where: { userId, clientId, status: Not('Pending') as any },
      order: { id: 'DESC' },
      skip,
      take,
    });
  }
}
