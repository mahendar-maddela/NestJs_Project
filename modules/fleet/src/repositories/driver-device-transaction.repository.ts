import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceTransaction } from '../../../sessions/src/entities/device-transaction.entity';
import { ChargingSession } from '../../../sessions/src/entities/charging-session.entity';
import { TransactionDetail } from '../../../sessions/src/entities/transaction-detail.entity';
import { Connector } from '../../../chargers/src/entities/connector.entity';
import { FleetDriverVehicle } from '../entities/fleet-driver-vehicle.entity';

/** Mirrors `controllers/APP/FleetDriver/DeviceTransactionController.js`. */
@Injectable()
export class DriverDeviceTransactionRepository {
  constructor(
    @InjectRepository(DeviceTransaction) private readonly deviceTransactionRepo: Repository<DeviceTransaction>,
    @InjectRepository(ChargingSession) private readonly chargingSessionRepo: Repository<ChargingSession>,
    @InjectRepository(TransactionDetail) private readonly transactionDetailRepo: Repository<TransactionDetail>,
    @InjectRepository(Connector) private readonly connectorRepo: Repository<Connector>,
    @InjectRepository(FleetDriverVehicle) private readonly fleetDriverVehicleRepo: Repository<FleetDriverVehicle>,
  ) {}

  async findAndCountByDriver(fleetId: number, fleetUserId: number, skip: number, take: number) {
    const qb = this.deviceTransactionRepo
      .createQueryBuilder('dt')
      .select(['dt.chargerRef', 'dt.id', 'dt.transactionId', 'dt.startDate', 'dt.totalWh', 'dt.stopDate', 'dt.startSoc', 'dt.stopSoc', 'dt.status', 'dt.charginDuration', 'dt.createdAt'])
      .leftJoin(ChargingSession, 'session', 'session.transactionId = dt.id')
      .addSelect(['session.id', 'session.transactionId', 'session.sessionId'])
      .leftJoin('dt.vehicle', 'vehicle')
      .addSelect(['vehicle.vinNumber', 'vehicle.regNo'])
      .leftJoin('dt.charger', 'charger')
      .addSelect(['charger.id', 'charger.stationId'])
      .leftJoin('charger.station', 'station')
      .addSelect(['station.id', 'station.name'])
      .leftJoin('station.stationLocation', 'stationLocation')
      .addSelect(['stationLocation.address', 'stationLocation.city', 'stationLocation.state', 'stationLocation.country', 'stationLocation.pincode'])
      .where('dt.fleetId = :fleetId', { fleetId })
      .andWhere('(dt.startDriverId = :fleetUserId OR dt.stopDriverId = :fleetUserId)', { fleetUserId })
      .orderBy('dt.id', 'DESC')
      .skip(skip)
      .take(take);

    return qb.getManyAndCount();
  }

  findRunningSessionsByDriver(fleetId: number, fleetUserId: number) {
    return this.chargingSessionRepo
      .createQueryBuilder('cs')
      .select(['cs.sessionId', 'cs.chargerId', 'cs.connectorId'])
      .innerJoin('cs.transaction', 'transaction', 'transaction.status = 0')
      .addSelect(['transaction.transactionId', 'transaction.startSoc', 'transaction.createdAt', 'transaction.stopSoc', 'transaction.startDate', 'transaction.stopDate'])
      .where('cs.fleetId = :fleetId', { fleetId })
      .andWhere('cs.status = :status', { status: 'Started' })
      .andWhere('cs.startDriverId = :fleetUserId', { fleetUserId })
      .getMany();
  }

  findSessionWithTransactionBySessionId(sessionId: string) {
    return this.chargingSessionRepo
      .createQueryBuilder('cs')
      .select(['cs.sessionId', 'cs.id'])
      .innerJoinAndSelect('cs.transaction', 'transaction')
      .leftJoinAndSelect('transaction.charger', 'charger')
      .leftJoinAndSelect('charger.station', 'station')
      .leftJoinAndSelect('station.stationLocation', 'stationLocation')
      .leftJoinAndSelect('transaction.vehicle', 'vehicle')
      .where('cs.sessionId = :sessionId', { sessionId })
      .getRawOne();
  }

  findLatestTransactionDetail(transactionId: number) {
    return this.transactionDetailRepo.findOne({ where: { transactionId }, order: { createdAt: 'DESC' } });
  }

  findConnectors(connectorId: string, chargerRef: number) {
    return this.connectorRepo.find({ where: { connectorId, chargerId: chargerRef } });
  }

  findAssignedVehicle(fleetUserId: number, today: string, currentTime: string) {
    return this.fleetDriverVehicleRepo
      .createQueryBuilder('fdv')
      .leftJoinAndSelect('fdv.vehicle', 'vehicle')
      .leftJoinAndSelect('vehicle.model', 'model')
      .leftJoinAndSelect('model.brand', 'brand')
      .where('fdv.status = :status', { status: 'Assigned' })
      .andWhere('fdv.startDate <= :today', { today })
      .andWhere('fdv.startTime <= :currentTime', { currentTime })
      .andWhere('fdv.endTime >= :currentTime', { currentTime })
      .andWhere('fdv.fleetDriverId = :fleetUserId', { fleetUserId })
      .getRawOne();
  }
}
