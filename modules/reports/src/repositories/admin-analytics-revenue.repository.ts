import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { DeviceTransaction } from '../../../sessions/src/entities/device-transaction.entity';
import { Station } from '../../../stations/src/entities/station.entity';
import { MonthlyAnalytics } from '../entities/monthly-analytics.entity';

export interface RevenueFilters {
  /** Optional for super-admin (cross-client); mandatory in practice for admin/vendor callers. */
  clientId?: number;
  chargerRef?: number;
  vendorId?: number;
  stationId?: number;
}

@Injectable()
export class AdminAnalyticsRevenueRepository {
  constructor(
    @InjectRepository(DeviceTransaction) private readonly deviceTransactionRepo: Repository<DeviceTransaction>,
    @InjectRepository(Station) private readonly stationRepo: Repository<Station>,
    @InjectRepository(MonthlyAnalytics) private readonly monthlyAnalyticsRepo: Repository<MonthlyAnalytics>,
  ) {}

  private baseQb(filters: RevenueFilters) {
    const qb = this.deviceTransactionRepo.createQueryBuilder('dt').innerJoin('dt.charger', 'charger');

    if (filters.clientId) qb.andWhere('charger.clientId = :clientId', { clientId: filters.clientId });
    if (filters.vendorId) qb.andWhere('charger.vendorId = :vendorId', { vendorId: filters.vendorId });
    if (filters.stationId) qb.andWhere('charger.stationId = :stationId', { stationId: filters.stationId });
    if (filters.chargerRef) qb.andWhere('dt.chargerRef = :chargerRef', { chargerRef: filters.chargerRef });

    return qb;
  }

  async sumPrice(filters: RevenueFilters, startDate?: Date, endDate?: Date, status?: number): Promise<number> {
    const qb = this.baseQb(filters);
    if (startDate) qb.andWhere('dt.createdAt >= :startDate', { startDate });
    if (endDate) qb.andWhere('dt.createdAt <= :endDate', { endDate });
    if (status !== undefined) qb.andWhere('dt.status = :status', { status });
    const raw = await qb.select('SUM(dt.price)', 'total').getRawOne<{ total: string | null }>();
    return Number(raw?.total) || 0;
  }

  async sumTotalWh(filters: RevenueFilters, startDate: Date, endDate: Date, status?: number): Promise<number> {
    const qb = this.baseQb(filters).andWhere('dt.createdAt >= :startDate AND dt.createdAt <= :endDate', { startDate, endDate });
    if (status !== undefined) qb.andWhere('dt.status = :status', { status });
    const raw = await qb.select('SUM(dt.totalWh)', 'total').getRawOne<{ total: string | null }>();
    return Number(raw?.total) || 0;
  }

  async countTransactions(filters: RevenueFilters, startDate?: Date, endDate?: Date, status?: number): Promise<number> {
    const qb = this.baseQb(filters);
    if (startDate) qb.andWhere('dt.createdAt >= :startDate', { startDate });
    if (endDate) qb.andWhere('dt.createdAt <= :endDate', { endDate });
    if (status !== undefined) qb.andWhere('dt.status = :status', { status });
    return qb.getCount();
  }

  findStationsWithChargers(clientId: number) {
    return this.stationRepo.find({
      where: { clientId },
      select: { id: true, name: true, stationUniqueId: true, vendorId: true },
      relations: { chargers: true },
    });
  }

  findMonthlyAnalytics(params: { year: number; month: number; clientId?: number; vendorId?: number; stationId?: number; chargerId?: number; fleetId?: number }) {
    const where: any = { year: params.year, month: params.month };
    if (params.clientId) where.clientId = params.clientId;
    if (params.vendorId) where.vendorId = params.vendorId;
    if (params.stationId) where.stationId = params.stationId;
    if (params.chargerId) where.chargerId = params.chargerId;
    if (params.fleetId) where.fleetId = params.fleetId;
    return this.monthlyAnalyticsRepo.findOne({ where });
  }

  async upsertMonthlyAnalytics(data: Partial<MonthlyAnalytics>) {
    const existing = await this.monthlyAnalyticsRepo.findOne({
      where: {
        year: data.year!,
        month: data.month!,
        clientId: data.clientId!,
        vendorId: data.vendorId ?? IsNull(),
        stationId: data.stationId ?? IsNull(),
        chargerId: data.chargerId ?? IsNull(),
        fleetId: data.fleetId ?? IsNull(),
      },
    });
    if (existing) {
      await this.monthlyAnalyticsRepo.update(existing.id, data as any);
    } else {
      await this.monthlyAnalyticsRepo.save(this.monthlyAnalyticsRepo.create(data));
    }
  }

  async findTransactionsForDownload(
    clientId: number,
    filters: { vendorIds: number[]; stationIds: number[]; chargerIds: number[]; startDate?: Date; endDate?: Date; applyGst: boolean },
  ) {
    const qb = this.deviceTransactionRepo
      .createQueryBuilder('dt')
      .innerJoinAndSelect('dt.charger', 'charger')
      .leftJoinAndSelect('charger.station', 'station')
      .leftJoinAndSelect('charger.vendor', 'vendor')
      .leftJoinAndSelect('dt.fleetUser', 'fleetUser')
      .leftJoinAndSelect('fleetUser.fleetUsers', 'fleetManagers', 'fleetManagers.type = :fleetManagerType', { fleetManagerType: 'FLEET_MANAGER' })
      .where('charger.clientId = :clientId', { clientId });

    // Legacy applies the GST filter inside the User include's ON clause (required: false), so it
    // nulls out non-matching users rather than dropping the transaction row (fleet-only rows have no user at all).
    if (filters.applyGst) {
      qb.leftJoinAndSelect('dt.user', 'user', "user.gst IS NOT NULL AND user.gst != ''");
    } else {
      qb.leftJoinAndSelect('dt.user', 'user');
    }

    if (filters.vendorIds.length) qb.andWhere('charger.vendorId IN (:...vendorIds)', { vendorIds: filters.vendorIds });
    if (filters.stationIds.length) qb.andWhere('charger.stationId IN (:...stationIds)', { stationIds: filters.stationIds });
    if (filters.chargerIds.length) qb.andWhere('dt.chargerRef IN (:...chargerIds)', { chargerIds: filters.chargerIds });
    if (filters.startDate && filters.endDate) {
      qb.andWhere('dt.createdAt BETWEEN :startDate AND :endDate', { startDate: filters.startDate, endDate: filters.endDate });
    }

    qb.orderBy('dt.createdAt', 'ASC');
    return qb.getMany();
  }

  /** Mirrors `controllers/suparAdmin/analyticsRevenueController.js:downloadSessionReportsByFilters` — cross-client, multiple ids per dimension. */
  async findTransactionsForDownloadCrossClient(filters: {
    clientIds: number[];
    vendorIds: number[];
    stationIds: number[];
    chargerIds: number[];
    startDate?: Date;
    endDate?: Date;
    applyGst: boolean;
  }) {
    const qb = this.deviceTransactionRepo
      .createQueryBuilder('dt')
      .innerJoinAndSelect('dt.charger', 'charger')
      .leftJoinAndSelect('charger.station', 'station')
      .leftJoinAndSelect('charger.vendor', 'vendor')
      .leftJoinAndSelect('dt.fleetUser', 'fleetUser')
      .leftJoinAndSelect('fleetUser.fleetUsers', 'fleetManagers', 'fleetManagers.type = :fleetManagerType', { fleetManagerType: 'FLEET_MANAGER' });

    if (filters.applyGst) {
      qb.leftJoinAndSelect('dt.user', 'user', "user.gst IS NOT NULL AND user.gst != ''");
    } else {
      qb.leftJoinAndSelect('dt.user', 'user');
    }

    if (filters.clientIds.length) qb.andWhere('charger.clientId IN (:...clientIds)', { clientIds: filters.clientIds });
    if (filters.vendorIds.length) qb.andWhere('charger.vendorId IN (:...vendorIds)', { vendorIds: filters.vendorIds });
    if (filters.stationIds.length) qb.andWhere('charger.stationId IN (:...stationIds)', { stationIds: filters.stationIds });
    if (filters.chargerIds.length) qb.andWhere('dt.chargerRef IN (:...chargerIds)', { chargerIds: filters.chargerIds });
    if (filters.startDate && filters.endDate) {
      qb.andWhere('dt.createdAt BETWEEN :startDate AND :endDate', { startDate: filters.startDate, endDate: filters.endDate });
    }

    qb.orderBy('dt.createdAt', 'ASC');
    return qb.getMany();
  }
}
