import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceTransaction } from '../../../sessions/src/entities/device-transaction.entity';
import { Station } from '../../../stations/src/entities/station.entity';

/**
 * Mirrors the two `:chargerId`-route-param handlers in `controllers/vendors/AnalyticsRevenueController.js`
 * (`getTodayRevenue`, `getMonthlyRevenue`), which filter `DeviceTransaction.chargerId` (the business
 * string column) rather than the numeric `chargerRef` FK used by every other endpoint in that file —
 * kept separate from `AdminAnalyticsRevenueRepository` for that reason.
 */
@Injectable()
export class VendorAnalyticsRevenueRepository {
  constructor(
    @InjectRepository(DeviceTransaction) private readonly deviceTransactionRepo: Repository<DeviceTransaction>,
    @InjectRepository(Station) private readonly stationRepo: Repository<Station>,
  ) {}

  async sumPriceByChargerIdString(chargerId: string, vendorId: number, startDate: Date, endDate?: Date): Promise<number> {
    const qb = this.deviceTransactionRepo
      .createQueryBuilder('dt')
      .innerJoin('dt.charger', 'charger')
      .where('dt.chargerId = :chargerId', { chargerId })
      .andWhere('charger.vendorId = :vendorId', { vendorId })
      .andWhere('dt.createdAt >= :startDate', { startDate });
    if (endDate) qb.andWhere('dt.createdAt <= :endDate', { endDate });
    const raw = await qb.select('SUM(dt.price)', 'total').getRawOne<{ total: string | null }>();
    return Number(raw?.total) || 0;
  }

  // Legacy filters the nested `chargers` include by the same `vendorId` too (`required: false`),
  // so a charger belonging to a different vendor than its station is excluded, not just unmatched.
  findStationsWithChargersForVendor(vendorId: number) {
    return this.stationRepo
      .createQueryBuilder('station')
      .select(['station.id', 'station.name', 'station.stationUniqueId'])
      .leftJoinAndSelect('station.chargers', 'chargers', 'chargers.vendorId = :vendorId', { vendorId })
      .addSelect(['chargers.id', 'chargers.chargerId', 'chargers.capacity', 'chargers.powerType'])
      .where('station.vendorId = :vendorId', { vendorId })
      .getMany();
  }
}
