import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceTransaction } from '../../../sessions/src/entities/device-transaction.entity';

export interface FleetAnalyticsFilters {
  fleetId: number;
  chargerRef?: number;
  vehicleId?: number;
  driverId?: number;
  vendorId?: number;
  stationId?: number;
}

/** Mirrors `controllers/Fleet/analyticsController.js`. */
@Injectable()
export class FleetAnalyticsRepository {
  constructor(@InjectRepository(DeviceTransaction) private readonly repo: Repository<DeviceTransaction>) {}

  private baseQb(filters: FleetAnalyticsFilters) {
    const qb = this.repo
      .createQueryBuilder('dt')
      .innerJoin('dt.charger', 'charger')
      .where('dt.fleetId = :fleetId', { fleetId: filters.fleetId });

    if (filters.chargerRef) qb.andWhere('dt.chargerRef = :chargerRef', { chargerRef: filters.chargerRef });
    if (filters.vehicleId) qb.andWhere('dt.vehicleId = :vehicleId', { vehicleId: filters.vehicleId });
    if (filters.driverId) qb.andWhere('(dt.startDriverId = :driverId OR dt.stopDriverId = :driverId)', { driverId: filters.driverId });
    if (filters.vendorId) qb.andWhere('charger.vendorId = :vendorId', { vendorId: filters.vendorId });
    if (filters.stationId) qb.andWhere('charger.stationId = :stationId', { stationId: filters.stationId });

    return qb;
  }

  async sumField(filters: FleetAnalyticsFilters, field: 'price' | 'totalWh' | 'gst' | 'amount', startDate?: Date, endDate?: Date, status?: number): Promise<number> {
    const qb = this.baseQb(filters);
    if (startDate) qb.andWhere('dt.createdAt >= :startDate', { startDate });
    if (endDate) qb.andWhere('dt.createdAt <= :endDate', { endDate });
    if (status !== undefined) qb.andWhere('dt.status = :status', { status });
    const raw = await qb.select(`SUM(dt.${field})`, 'total').getRawOne<{ total: string | null }>();
    return Number(raw?.total) || 0;
  }

  async countTx(filters: FleetAnalyticsFilters, startDate?: Date, endDate?: Date): Promise<number> {
    const qb = this.baseQb(filters);
    if (startDate) qb.andWhere('dt.createdAt >= :startDate', { startDate });
    if (endDate) qb.andWhere('dt.createdAt <= :endDate', { endDate });
    return qb.getCount();
  }

  /** Mirrors `controllers/Fleet/overViewController.js:topConsumptionVehicles`. */
  findTopConsumptionVehicles(fleetId: number) {
    return this.repo
      .createQueryBuilder('dt')
      .select('dt.vehicleId', 'vehicleId')
      .addSelect('ROUND(SUM(dt.totalWh) / 1000, 2)', 'totalConsumptionKwh')
      .addSelect('vehicle.id', 'vehicle_id')
      .addSelect('vehicle.regNo', 'vehicle_regNo')
      .addSelect('model.id', 'model_id')
      .addSelect('model.name', 'model_name')
      .addSelect('model.status', 'model_status')
      .addSelect('brand.id', 'brand_id')
      .addSelect('brand.name', 'brand_name')
      .innerJoin('dt.vehicle', 'vehicle')
      .leftJoin('vehicle.model', 'model')
      .leftJoin('model.brand', 'brand')
      .where('dt.fleetId = :fleetId', { fleetId })
      .groupBy('dt.vehicleId')
      .addGroupBy('vehicle.id')
      .addGroupBy('model.id')
      .addGroupBy('brand.id')
      .orderBy('totalConsumptionKwh', 'DESC')
      .limit(5)
      .getRawMany<{
        vehicleId: number;
        totalConsumptionKwh: string;
        vehicle_id: number;
        vehicle_regNo: string | null;
        model_id: number | null;
        model_name: string | null;
        model_status: string | null;
        brand_id: number | null;
        brand_name: string | null;
      }>();
  }

  /** Mirrors `controllers/Fleet/overViewController.js:timeWiseConsumptions`. */
  findTimeWiseConsumption(fleetId: number) {
    return this.repo
      .createQueryBuilder('dt')
      .select(
        `CASE
          WHEN HOUR(dt.createdAt) BETWEEN 0 AND 5 THEN '12 AM - 6 AM'
          WHEN HOUR(dt.createdAt) BETWEEN 6 AND 11 THEN '6 AM - 12 PM'
          WHEN HOUR(dt.createdAt) BETWEEN 12 AND 17 THEN '12 PM - 6 PM'
          ELSE '6 PM - 12 AM'
        END`,
        'time',
      )
      .addSelect('ROUND(SUM(dt.totalWh) / 1000, 2)', 'kwh')
      .where('dt.fleetId = :fleetId', { fleetId })
      .groupBy('time')
      .getRawMany<{ time: string; kwh: string }>();
  }

  async findDistinctStationsByFleet(fleetId: number) {
    const rows = await this.repo
      .createQueryBuilder('dt')
      .innerJoin('dt.charger', 'charger')
      .innerJoin('charger.station', 'station')
      .select(['station.id AS id', 'station.name AS name', 'station.stationUniqueId AS stationUniqueId', 'station.stationType AS stationType'])
      .where('dt.fleetId = :fleetId', { fleetId })
      .distinct(true)
      .getRawMany<{ id: number; name: string; stationUniqueId: string; stationType: string }>();

    return rows;
  }
}
