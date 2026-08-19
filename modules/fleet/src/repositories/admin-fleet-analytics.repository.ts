import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceTransaction } from '../../../sessions/src/entities/device-transaction.entity';
import { FleetUser } from '../entities/fleet-user.entity';
import { FleetUserDetail } from '../entities/fleet-user-detail.entity';
import { FleetVehicleGroup } from '../entities/fleet-vehicle-group.entity';
import { Vehicle } from '../../../users/src/entities/vehicle.entity';

@Injectable()
export class AdminFleetAnalyticsRepository {
  constructor(
    @InjectRepository(DeviceTransaction) private readonly deviceTransactionRepo: Repository<DeviceTransaction>,
    @InjectRepository(FleetUser) private readonly fleetUserRepo: Repository<FleetUser>,
    @InjectRepository(FleetUserDetail) private readonly fleetUserDetailRepo: Repository<FleetUserDetail>,
    @InjectRepository(Vehicle) private readonly vehicleRepo: Repository<Vehicle>,
    @InjectRepository(FleetVehicleGroup) private readonly fleetVehicleGroupRepo: Repository<FleetVehicleGroup>,
  ) {}

  countVehiclesByFleetOnly(fleetId: number) {
    return this.vehicleRepo.count({ where: { fleetId } });
  }

  countDriversByFleetOnly(fleetId: number) {
    return this.fleetUserRepo.count({ where: { fleetId, type: 'DRIVER' } });
  }

  countGroupsByFleetOnly(fleetId: number) {
    return this.fleetVehicleGroupRepo.count({ where: { fleetId } });
  }

  private vendorScopedQb(fleetId: number, vendorId: number) {
    return this.deviceTransactionRepo
      .createQueryBuilder('dt')
      .innerJoin('dt.charger', 'charger')
      .where('dt.fleetId = :fleetId', { fleetId })
      .andWhere('charger.vendorId = :vendorId', { vendorId });
  }

  countByFleetAndVendor(fleetId: number, vendorId: number): Promise<number> {
    return this.vendorScopedQb(fleetId, vendorId).getCount();
  }

  async sumByFleetAndVendor(fleetId: number, vendorId: number, field: 'price' | 'totalWh'): Promise<number> {
    const raw = await this.vendorScopedQb(fleetId, vendorId).select(`SUM(dt.${field})`, 'total').getRawOne<{ total: string | null }>();
    return Number(raw?.total) || 0;
  }

  async sumByFleetVendorAndMonth(
    fleetId: number,
    vendorId: number,
    stationId: number | undefined,
    chargerRef: number | undefined,
    field: 'price' | 'totalWh',
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const qb = this.vendorScopedQb(fleetId, vendorId).andWhere('dt.createdAt >= :startDate AND dt.createdAt <= :endDate', { startDate, endDate });
    if (stationId) qb.andWhere('charger.stationId = :stationId', { stationId });
    if (chargerRef) qb.andWhere('dt.chargerRef = :chargerRef', { chargerRef });
    const raw = await qb.select(`SUM(dt.${field})`, 'total').getRawOne<{ total: string | null }>();
    return Number(raw?.total) || 0;
  }

  findFleetByIdAndClient(id: number, clientId: number) {
    return this.fleetUserDetailRepo.findOne({ where: { id, clientId }, select: { id: true } });
  }

  async sumByFleetAndMonth(fleetId: number, field: 'price' | 'totalWh', startDate: Date, endDate: Date): Promise<number> {
    const raw = await this.deviceTransactionRepo
      .createQueryBuilder('dt')
      .select(`SUM(dt.${field})`, 'total')
      .where('dt.fleetId = :fleetId', { fleetId })
      .andWhere('dt.createdAt >= :startDate AND dt.createdAt <= :endDate', { startDate, endDate })
      .getRawOne<{ total: string | null }>();
    return Number(raw?.total) || 0;
  }

  async countByFleetAndMonth(fleetId: number, startDate: Date, endDate: Date): Promise<number> {
    return this.deviceTransactionRepo
      .createQueryBuilder('dt')
      .where('dt.fleetId = :fleetId', { fleetId })
      .andWhere('dt.createdAt >= :startDate AND dt.createdAt <= :endDate', { startDate, endDate })
      .getCount();
  }

  countDriversByFleet(fleetId: number, clientId: number) {
    return this.fleetUserRepo.count({ where: { fleetId, type: 'DRIVER', clientId } });
  }

  countVehiclesByFleet(fleetId: number, clientId: number) {
    return this.vehicleRepo.count({ where: { fleetId, clientId } });
  }

  async sumTotalByFleet(fleetId: number, field: 'price' | 'totalWh'): Promise<number> {
    const raw = await this.deviceTransactionRepo
      .createQueryBuilder('dt')
      .select(`SUM(dt.${field})`, 'total')
      .where('dt.fleetId = :fleetId', { fleetId })
      .getRawOne<{ total: string | null }>();
    return Number(raw?.total) || 0;
  }
}
