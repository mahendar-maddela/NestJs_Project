import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceTransaction } from '../entities/device-transaction.entity';
import { TransactionDetail } from '../entities/transaction-detail.entity';

export interface ChargerAnalyticsFilters {
  /** Optional for super-admin (cross-client); mandatory in practice for admin/vendor callers. */
  clientId?: number;
  chargerRef?: number;
  vendorId?: number;
  stationId?: number;
}

@Injectable()
export class AdminAnalyticsChargerRepository {
  constructor(
    @InjectRepository(DeviceTransaction) private readonly deviceTransactionRepo: Repository<DeviceTransaction>,
    @InjectRepository(TransactionDetail) private readonly transactionDetailRepo: Repository<TransactionDetail>,
  ) {}

  private deviceTransactionQb(filters: ChargerAnalyticsFilters, requireCreatedAtFrom?: Date) {
    const qb = this.deviceTransactionRepo.createQueryBuilder('dt').innerJoin('dt.charger', 'charger');

    if (filters.clientId) qb.andWhere('charger.clientId = :clientId', { clientId: filters.clientId });
    if (filters.vendorId) qb.andWhere('charger.vendorId = :vendorId', { vendorId: filters.vendorId });
    if (filters.stationId) qb.andWhere('charger.stationId = :stationId', { stationId: filters.stationId });
    if (filters.chargerRef) qb.andWhere('dt.chargerRef = :chargerRef', { chargerRef: filters.chargerRef });
    if (requireCreatedAtFrom) qb.andWhere('dt.createdAt >= :fromDate', { fromDate: requireCreatedAtFrom });

    return qb;
  }

  async sumTotalWh(filters: ChargerAnalyticsFilters, fromDate?: Date): Promise<number> {
    const raw = await this.deviceTransactionQb(filters, fromDate).select('SUM(dt.totalWh)', 'total').getRawOne<{ total: string | null }>();
    return Number(raw?.total) || 0;
  }

  async countTransactions(filters: ChargerAnalyticsFilters, fromDate?: Date): Promise<number> {
    return this.deviceTransactionQb(filters, fromDate).getCount();
  }

  async sumTotalWhBetween(filters: ChargerAnalyticsFilters, startDate: Date, endDate: Date): Promise<number> {
    const raw = await this.deviceTransactionQb(filters)
      .andWhere('dt.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .select('SUM(dt.totalWh)', 'total')
      .getRawOne<{ total: string | null }>();
    return Number(raw?.total) || 0;
  }

  async countTransactionsBetween(filters: ChargerAnalyticsFilters, startDate: Date, endDate: Date): Promise<number> {
    return this.deviceTransactionQb(filters).andWhere('dt.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate }).getCount();
  }

  private transactionDetailQb(filters: ChargerAnalyticsFilters) {
    const qb = this.transactionDetailRepo.createQueryBuilder('td').innerJoin('td.transaction', 'dt').innerJoin('dt.charger', 'charger');

    if (filters.clientId) qb.andWhere('charger.clientId = :clientId', { clientId: filters.clientId });
    if (filters.vendorId) qb.andWhere('charger.vendorId = :vendorId', { vendorId: filters.vendorId });
    if (filters.stationId) qb.andWhere('charger.stationId = :stationId', { stationId: filters.stationId });
    if (filters.chargerRef) qb.andWhere('dt.chargerRef = :chargerRef', { chargerRef: filters.chargerRef });

    return qb;
  }

  async minField(filters: ChargerAnalyticsFilters, field: 'currentOffered' | 'voltage'): Promise<number | null> {
    const raw = await this.transactionDetailQb(filters).select(`MIN(td.${field})`, 'value').getRawOne<{ value: string | null }>();
    return raw?.value != null ? Number(raw.value) : null;
  }

  async maxField(filters: ChargerAnalyticsFilters, field: 'currentOffered' | 'voltage' | 'temperature'): Promise<number | null> {
    const raw = await this.transactionDetailQb(filters).select(`MAX(td.${field})`, 'value').getRawOne<{ value: string | null }>();
    return raw?.value != null ? Number(raw.value) : null;
  }
}
