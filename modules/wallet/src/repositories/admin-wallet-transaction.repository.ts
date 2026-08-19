import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { WalletTransaction } from '../entities/wallet-transaction.entity';
import { Wallet } from '../entities/wallet.entity';
import { Charger } from '../../../chargers/src/entities/charger.entity';

export interface WalletTransactionFilters {
  clientId: number;
  vendorType?: number;
  vendorId?: number;
  search?: string;
  fromDate?: Date;
  toDate?: Date;
  staff?: boolean;
}

@Injectable()
export class AdminWalletTransactionRepository {
  constructor(
    @InjectRepository(WalletTransaction) private readonly repo: Repository<WalletTransaction>,
    @InjectRepository(Wallet) private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(Charger) private readonly chargerRepo: Repository<Charger>,
  ) {}

  /** Mirrors `controllers/Fleet/walletTransaction.js:getFleetWalletTransactions`. */
  findFleetWallet(fleetId: number) {
    return this.walletRepo.findOne({ where: { fleetId, type: 'Fleet' } });
  }

  /** Mirrors `controllers/Web/walletTransactionController.js:getWalletTransaction`. */
  findUserWallet(userId: number, clientId: number) {
    return this.walletRepo.findOne({ where: { userId, type: 'User', clientId }, select: { id: true, balance: true } });
  }

  async findAndCountByWalletUserType(walletId: number, clientId: number, skip: number, take: number) {
    return this.repo.findAndCount({
      where: { walletId, userType: 'User' as any, clientId },
      select: { refNo: true, createdAt: true, amount: true, type: true },
      order: { id: 'DESC' },
      skip,
      take,
    });
  }

  /** Mirrors `controllers/APP/walletTransactionsController.js:getWalletTransaction` — no clientId scope (legacy quirk, preserved). */
  findUserWalletNoClientScope(userId: number) {
    return this.walletRepo.findOne({ where: { userId, type: 'User' }, select: { id: true, balance: true } });
  }

  async findAndCountByWalletWithCharger(
    walletId: number,
    filters: { today?: boolean; credit?: boolean; debit?: boolean },
    skip: number,
    take: number,
  ) {
    const qb = this.repo
      .createQueryBuilder('wt')
      .select(['wt.refNo', 'wt.createdAt', 'wt.amount', 'wt.type', 'wt.note', 'wt.chargerId'])
      .where('wt.walletId = :walletId', { walletId })
      .andWhere('wt.userType = :userType', { userType: 'User' });

    if (filters.today) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      qb.andWhere('wt.createdAt BETWEEN :start AND :end', { start, end });
    }
    if (filters.credit) qb.andWhere("wt.type = 'Credit'");
    if (filters.debit) qb.andWhere("wt.type = 'Debit'");

    qb.orderBy('wt.id', 'DESC').skip(skip).take(take);

    const [rows, count] = await qb.getManyAndCount();

    // WalletTransaction has no formal charger relation — resolved via a batched lookup instead.
    const chargerIds = [...new Set(rows.map((r) => r.chargerId).filter((id): id is number => id != null))];
    const chargers = chargerIds.length
      ? await this.chargerRepo.find({ where: { id: In(chargerIds) }, relations: { station: true }, select: { id: true, chargerId: true, stationId: true } })
      : [];
    const chargerById = new Map(chargers.map((c) => [c.id, c]));

    const rowsWithCharger = rows.map((r) => ({ ...r, charger: r.chargerId != null ? chargerById.get(r.chargerId) ?? null : null }));

    return [rowsWithCharger, count] as const;
  }

  async findAndCountByWallet(walletId: number, type: string | undefined, skip: number, take: number) {
    const qb = this.repo
      .createQueryBuilder('wt')
      .select(['wt.id', 'wt.refNo', 'wt.amount', 'wt.type', 'wt.remainingBalance', 'wt.createdAt'])
      .leftJoin('wt.paymentTransaction', 'paymentTransaction')
      .addSelect(['paymentTransaction.id', 'paymentTransaction.paymentId', 'paymentTransaction.status', 'paymentTransaction.amount'])
      .where('wt.walletId = :walletId', { walletId });

    if (type) qb.andWhere('wt.type = :type', { type });

    qb.orderBy('wt.createdAt', 'DESC').skip(skip).take(take);

    return qb.getManyAndCount();
  }

  async findAndCountPaginated(filters: WalletTransactionFilters, skip: number, take: number) {
    const qb = this.repo
      .createQueryBuilder('wt')
      .leftJoin('wt.wallet', 'wallet')
      .addSelect(['wallet.id'])
      .leftJoin('wallet.user', 'user')
      .addSelect(['user.userId', 'user.id', 'user.first_name'])
      .leftJoin('wallet.fleetUserDetail', 'fleetUserDetail')
      .addSelect(['fleetUserDetail.id', 'fleetUserDetail.cName', 'fleetUserDetail.fleetUId'])
      .leftJoin('wt.staff', 'staff')
      .addSelect(['staff.id', 'staff.first_name'])
      .leftJoin('wt.paymentTransaction', 'paymentTransaction')
      .addSelect(['paymentTransaction.id', 'paymentTransaction.paymentId'])
      .where('wt.clientId = :clientId', { clientId: filters.clientId });

    if (filters.vendorId) {
      qb.andWhere('wallet.vendorId = :vendorId', { vendorId: filters.vendorId });
    }
    if (filters.vendorType) {
      qb.leftJoin('wallet.vendor', 'vendor').andWhere('vendor.vendorTypeId = :vendorType', { vendorType: filters.vendorType });
    }
    if (filters.staff) {
      qb.andWhere('wt.staffId IS NOT NULL');
    }
    if (filters.fromDate && filters.toDate) {
      qb.andWhere('wt.createdAt BETWEEN :fromDate AND :toDate', { fromDate: filters.fromDate, toDate: filters.toDate });
    }
    if (filters.search) {
      const search = `%${filters.search}%`;
      qb.andWhere(
        '(wt.refNo LIKE :search OR wt.amount LIKE :search OR user.userId LIKE :search OR user.first_name LIKE :search OR fleetUserDetail.fleetUId LIKE :search OR fleetUserDetail.cName LIKE :search)',
        { search },
      );
    }

    qb.orderBy('wt.id', 'DESC').skip(skip).take(take);

    return qb.getManyAndCount();
  }
}
