import { Injectable } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PaymentTransaction } from '../entities/payment-transaction.entity';
import { WalletTransaction } from '../../../wallet/src/entities/wallet-transaction.entity';

@Injectable()
export class SuperAdminTransactionsRepository {
  constructor(
    @InjectRepository(PaymentTransaction)
    private readonly paymentTransactionRepo: Repository<PaymentTransaction>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async findAndCountPaymentTransactions(
    where: Record<string, unknown>,
    skip: number,
    limit: number,
  ) {
    const [data, total] = await this.paymentTransactionRepo.findAndCount({
      where: where as any,
      skip,
      take: limit,
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });
    return { total, data };
  }

  async findAndCountWalletTransactions(
    where: Record<string, unknown>,
    skip: number,
    limit: number,
  ) {
    const walletTransactionRepo = this.dataSource.getRepository(WalletTransaction);
    const [data, total] = await walletTransactionRepo.findAndCount({
      where: where as any,
      skip,
      take: limit,
      relations: { wallet: { user: true } },
      order: { createdAt: 'DESC' },
    });
    return { total, data };
  }
}
