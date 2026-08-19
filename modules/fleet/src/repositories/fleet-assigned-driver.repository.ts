import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FleetUser } from '../entities/fleet-user.entity';
import { Vehicle } from '../../../users/src/entities/vehicle.entity';
import { FleetDriverVehicle } from '../entities/fleet-driver-vehicle.entity';
import { DeviceTransaction } from '../../../sessions/src/entities/device-transaction.entity';

/** Mirrors `controllers/Fleet/vehicleDriveController.js`. */
@Injectable()
export class FleetAssignedDriverRepository {
  constructor(
    @InjectRepository(FleetUser) private readonly fleetUserRepo: Repository<FleetUser>,
    @InjectRepository(Vehicle) private readonly vehicleRepo: Repository<Vehicle>,
    @InjectRepository(FleetDriverVehicle) private readonly fleetDriverVehicleRepo: Repository<FleetDriverVehicle>,
    @InjectRepository(DeviceTransaction) private readonly deviceTransactionRepo: Repository<DeviceTransaction>,
  ) {}

  findDriverByIdFleetClient(id: number, fleetId: number, clientId: number) {
    return this.fleetUserRepo.findOne({ where: { id, fleetId, clientId } });
  }

  findVehicleByIdFleetClient(id: number, fleetId: number, clientId: number) {
    return this.vehicleRepo.findOne({ where: { id, fleetId, clientId } });
  }

  findVehicleTimeOverlap(vehicleId: number, startDate: string, normalizedStartTime: string, normalizedEndTime: string) {
    return this.fleetDriverVehicleRepo
      .createQueryBuilder('fdv')
      .where('fdv.vehicleId = :vehicleId', { vehicleId })
      .andWhere('fdv.status = :status', { status: 'Assigned' })
      .andWhere('DATE(fdv.startDate) = :startDate', { startDate })
      .andWhere('fdv.startTime < :normalizedEndTime', { normalizedEndTime })
      .andWhere('fdv.endTime > :normalizedStartTime', { normalizedStartTime })
      .getRawOne();
  }

  findDriverTimeOverlap(fleetDriverId: number, startDate: string, normalizedStartTime: string, normalizedEndTime: string) {
    return this.fleetDriverVehicleRepo
      .createQueryBuilder('fdv')
      .where('fdv.fleetDriverId = :fleetDriverId', { fleetDriverId })
      .andWhere('fdv.status = :status', { status: 'Assigned' })
      .andWhere('DATE(fdv.startDate) = :startDate', { startDate })
      .andWhere('fdv.startTime < :normalizedEndTime', { normalizedEndTime })
      .andWhere('fdv.endTime > :normalizedStartTime', { normalizedStartTime })
      .getRawOne();
  }

  createAssignment(data: Partial<FleetDriverVehicle>) {
    return this.fleetDriverVehicleRepo.save(this.fleetDriverVehicleRepo.create(data));
  }

  findAssignmentByIdStatusClient(id: number, status: string, clientId: number) {
    return this.fleetDriverVehicleRepo.findOne({ where: { id, status, clientId } });
  }

  async closeAssignment(id: number) {
    await this.fleetDriverVehicleRepo.update(id, { status: 'Closed', endDate: new Date() });
    return this.fleetDriverVehicleRepo.findOne({ where: { id } });
  }

  findAssignmentHistoryByVehicle(vehicleId: number, status: string | undefined, clientId: number) {
    const qb = this.fleetDriverVehicleRepo
      .createQueryBuilder('fdv')
      .innerJoinAndSelect('fdv.fleetDriver', 'fleetDriver', 'fleetDriver.type = :type', { type: 'DRIVER' })
      .where('fdv.vehicleId = :vehicleId', { vehicleId })
      .andWhere('fdv.clientId = :clientId', { clientId });

    if (status) qb.andWhere('fdv.status = :status', { status });

    return qb.orderBy('fdv.createdAt', 'DESC').getMany();
  }

  findDeviceTransactionsByVehicle(vehicleId: number) {
    return this.deviceTransactionRepo
      .createQueryBuilder('dt')
      .select(['dt.id', 'dt.transactionId', 'dt.startDate', 'dt.stopDate', 'dt.status', 'dt.totalWh', 'dt.amount', 'dt.charginDuration', 'dt.price'])
      .leftJoin('dt.charger', 'charger')
      .addSelect(['charger.id', 'charger.chargerId'])
      .leftJoin('charger.station', 'station')
      .addSelect(['station.id', 'station.name'])
      .where('dt.vehicleId = :vehicleId', { vehicleId })
      .orderBy('dt.startDate', 'DESC')
      .getMany();
  }
}
