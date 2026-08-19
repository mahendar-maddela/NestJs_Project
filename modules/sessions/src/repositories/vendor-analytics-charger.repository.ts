import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { DeviceTransaction } from '../entities/device-transaction.entity';
import { TransactionDetail } from '../entities/transaction-detail.entity';

const OWNED_CHARGER_EXISTS = `EXISTS (SELECT 1 FROM Chargers c WHERE c.chargerId = %ALIAS%.chargerId AND c.vendorId = :vendorId)`;

/**
 * Mirrors `controllers/vendors/AnalyticsChargerController.js`. Legacy reads `req.vendor.vendorId`
 * in every handler but never actually uses it in a query — every route is filterable by any
 * chargerId regardless of ownership. Fixed here by requiring the charger to belong to the calling
 * vendor via an EXISTS clause, which naturally yields the same zero/empty result legacy already
 * produces for a chargerId with no matching rows — no new response shape introduced.
 */
@Injectable()
export class VendorAnalyticsChargerRepository {
  constructor(
    @InjectRepository(DeviceTransaction) private readonly deviceTransactionRepo: Repository<DeviceTransaction>,
    @InjectRepository(TransactionDetail) private readonly transactionDetailRepo: Repository<TransactionDetail>,
  ) {}

  private dtQb(chargerId: string, vendorId: number): SelectQueryBuilder<DeviceTransaction> {
    return this.deviceTransactionRepo
      .createQueryBuilder('dt')
      .where('dt.chargerId = :chargerId', { chargerId })
      .andWhere(OWNED_CHARGER_EXISTS.replace('%ALIAS%', 'dt'), { vendorId });
  }

  private tdQb(chargerId: string, vendorId: number): SelectQueryBuilder<TransactionDetail> {
    return this.transactionDetailRepo
      .createQueryBuilder('td')
      .where('td.chargerId = :chargerId', { chargerId })
      .andWhere(OWNED_CHARGER_EXISTS.replace('%ALIAS%', 'td'), { vendorId });
  }

  async sumTotalWh(chargerId: string, vendorId: number, fromDate?: Date): Promise<number> {
    const qb = this.dtQb(chargerId, vendorId);
    if (fromDate) qb.andWhere('dt.createdAt >= :fromDate', { fromDate });
    const raw = await qb.select('SUM(dt.totalWh)', 'total').getRawOne<{ total: string | null }>();
    return Number(raw?.total) || 0;
  }

  async countTransactions(chargerId: string, vendorId: number, fromDate?: Date): Promise<number> {
    const qb = this.dtQb(chargerId, vendorId);
    if (fromDate) qb.andWhere('dt.createdAt >= :fromDate', { fromDate });
    return qb.getCount();
  }

  async sumTotalWhBetween(chargerId: string, vendorId: number, startDate: Date, endDate: Date): Promise<number> {
    const raw = await this.dtQb(chargerId, vendorId)
      .andWhere('dt.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .select('SUM(dt.totalWh)', 'total')
      .getRawOne<{ total: string | null }>();
    return Number(raw?.total) || 0;
  }

  countTransactionsBetween(chargerId: string, vendorId: number, startDate: Date, endDate: Date): Promise<number> {
    return this.dtQb(chargerId, vendorId).andWhere('dt.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate }).getCount();
  }

  async minField(chargerId: string, vendorId: number, field: 'currentOffered' | 'voltage'): Promise<number | null> {
    const raw = await this.tdQb(chargerId, vendorId).select(`MIN(td.${field})`, 'value').getRawOne<{ value: string | null }>();
    return raw?.value != null ? Number(raw.value) : null;
  }

  async maxField(chargerId: string, vendorId: number, field: 'currentOffered' | 'voltage' | 'temperature'): Promise<number | null> {
    const raw = await this.tdQb(chargerId, vendorId).select(`MAX(td.${field})`, 'value').getRawOne<{ value: string | null }>();
    return raw?.value != null ? Number(raw.value) : null;
  }
}
