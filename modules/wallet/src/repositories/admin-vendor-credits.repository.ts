import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Vendor } from '../../../vendors/src/entities/vendor.entity';
import { Wallet } from '../entities/wallet.entity';
import { WalletTransaction } from '../entities/wallet-transaction.entity';

@Injectable()
export class AdminVendorCreditsRepository {
  constructor(
    @InjectRepository(Vendor) private readonly vendorRepo: Repository<Vendor>,
    @InjectRepository(Wallet) private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(WalletTransaction) private readonly walletTransactionRepo: Repository<WalletTransaction>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async findAndCountStaffWalletTransactions(skip: number, take: number) {
    const qb = this.walletTransactionRepo
      .createQueryBuilder('wt')
      .leftJoinAndSelect('wt.wallet', 'wallet')
      .leftJoinAndSelect('wallet.vendor', 'vendor')
      .where('wt.staffId IS NOT NULL')
      .orderBy('wt.id', 'DESC')
      .skip(skip)
      .take(take);

    return qb.getManyAndCount();
  }

  async findLastTransactionRefNo() {
    return this.walletTransactionRepo.findOne({
      order: { id: 'DESC' },
      select: { id: true, refNo: true },
    });
  }

  /** Wraps the vendor lookup, wallet balance credit, and transaction insert in a single DB transaction. */
  async runInTransaction<T>(work: (repos: { vendor: Repository<Vendor>; wallet: Repository<Wallet>; walletTransaction: Repository<WalletTransaction> }) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(async (manager) => {
      return work({
        vendor: manager.getRepository(Vendor),
        wallet: manager.getRepository(Wallet),
        walletTransaction: manager.getRepository(WalletTransaction),
      });
    });
  }
}
