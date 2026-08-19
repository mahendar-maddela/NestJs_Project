import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { Vendor } from '../../../vendors/src/entities/vendor.entity';
import { User } from '../../../users/src/entities/user.entity';
import { Station } from '../../../stations/src/entities/station.entity';
import { Charger } from '../../../chargers/src/entities/charger.entity';
import { Connector } from '../../../chargers/src/entities/connector.entity';
import { DeviceTransaction } from '../../../sessions/src/entities/device-transaction.entity';

@Injectable()
export class AdminDashboardRepository {
  constructor(
    @InjectRepository(Vendor) private readonly vendorRepo: Repository<Vendor>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Station) private readonly stationRepo: Repository<Station>,
    @InjectRepository(Charger) private readonly chargerRepo: Repository<Charger>,
    @InjectRepository(Connector) private readonly connectorRepo: Repository<Connector>,
    @InjectRepository(DeviceTransaction) private readonly deviceTransactionRepo: Repository<DeviceTransaction>,
  ) {}

  countVendors(clientId: number, beforeDate?: Date) {
    return this.vendorRepo.count({ where: beforeDate ? { clientId, createdAt: LessThanOrEqual(beforeDate) } : { clientId } });
  }

  countVendorsByType(clientId: number, typeName: string, beforeDate?: Date) {
    const qb = this.vendorRepo
      .createQueryBuilder('vendor')
      .innerJoin('Vendor_Types', 'vendorType', 'vendorType.id = vendor.vendorTypeId')
      .where('vendor.clientId = :clientId', { clientId })
      .andWhere('vendorType.name = :typeName', { typeName });
    if (beforeDate) qb.andWhere('vendor.createdAt <= :beforeDate', { beforeDate });
    return qb.getCount();
  }

  /**
   * Legacy's `dashboard.js` builds these "initial" counts with two `where:` keys in the same
   * Sequelize.count() options object; the second silently clobbers the first, so clientId is
   * never applied here (only vendorType.name + createdAt). Preserved as-is for parity.
   */
  countVendorsByTypeGlobal(typeName: string, beforeDate?: Date) {
    const qb = this.vendorRepo
      .createQueryBuilder('vendor')
      .innerJoin('Vendor_Types', 'vendorType', 'vendorType.id = vendor.vendorTypeId')
      .where('vendorType.name = :typeName', { typeName });
    if (beforeDate) qb.andWhere('vendor.createdAt <= :beforeDate', { beforeDate });
    return qb.getCount();
  }

  countUsers(clientId: number, beforeDate?: Date) {
    return this.userRepo.count({ where: beforeDate ? { clientId, createdAt: LessThanOrEqual(beforeDate) } : { clientId } });
  }

  countStations(clientId: number, beforeDate?: Date) {
    return this.stationRepo.count({ where: beforeDate ? { clientId, createdAt: LessThanOrEqual(beforeDate) } : { clientId } });
  }

  countChargers(clientId: number, powerType?: 'AC' | 'DC', beforeDate?: Date) {
    const where: any = { clientId };
    if (powerType) where.powerType = powerType;
    if (beforeDate) where.createdAt = LessThanOrEqual(beforeDate);
    return this.chargerRepo.count({ where });
  }

  countConnectorsByStatus(clientId: number, status: string) {
    return this.connectorRepo
      .createQueryBuilder('connector')
      .innerJoin('connector.charger', 'charger')
      .where('charger.clientId = :clientId', { clientId })
      .andWhere('connector.status = :status', { status })
      .getCount();
  }

  async sumDeviceTransactionField(clientId: number, field: 'price' | 'totalWh', beforeDate?: Date) {
    const qb = this.deviceTransactionRepo
      .createQueryBuilder('dt')
      .select(`SUM(dt.${field})`, 'total')
      .where('dt.clientId = :clientId', { clientId });
    if (beforeDate) qb.andWhere('dt.createdAt <= :beforeDate', { beforeDate });
    const r = await qb.getRawOne<{ total: string | null }>();
    return Number(r?.total) || 0;
  }

  findFaultedConnectors(clientId: number) {
    const availableStatuses = ['Available', 'Engaged', 'Preparing', 'Charging', 'Finishing'];
    return this.connectorRepo
      .createQueryBuilder('connector')
      .leftJoinAndSelect('connector.charger', 'charger')
      .leftJoinAndSelect('charger.station', 'station')
      .leftJoinAndSelect('station.vendor', 'vendor')
      .where('charger.clientId = :clientId', { clientId })
      .andWhere('connector.status NOT IN (:...availableStatuses)', { availableStatuses })
      .orderBy('connector.updatedAt', 'DESC')
      .getMany();
  }

  findNotStoppedSessions(clientId: number) {
    return this.deviceTransactionRepo.find({
      where: { status: 0, isAbnormalStop: true, clientId },
      relations: {
        charger: { station: true },
        user: true,
        emsp: true,
        vehicle: true,
        fleetUser: { fleetUsers: true },
      },
    });
  }

  findNotStoppedSessionById(id: number, clientId: number) {
    return this.deviceTransactionRepo.findOne({
      where: { status: 0, id, clientId },
      select: {
        id: true,
        chargerRef: true,
        connectorId: true,
        transactionId: true,
        startMeterValue: true,
        stopMeterValue: true,
        status: true,
        chargerId: true,
      },
    });
  }

  findNextTransaction(chargerId: string | null, connectorId: string | null, afterId: number) {
    if (!chargerId || !connectorId) return Promise.resolve(null);
    return this.deviceTransactionRepo
      .createQueryBuilder('dt')
      .select(['dt.startMeterValue', 'dt.id', 'dt.transactionId'])
      .where('dt.chargerId = :chargerId', { chargerId })
      .andWhere('dt.connectorId = :connectorId', { connectorId })
      .andWhere('dt.id > :afterId', { afterId })
      .orderBy('dt.id', 'ASC')
      .getRawOne();
  }

  findNotStoppedSessionForStop(id: number, clientId: number) {
    return this.deviceTransactionRepo.findOne({ where: { status: 0, id, clientId } });
  }
}
