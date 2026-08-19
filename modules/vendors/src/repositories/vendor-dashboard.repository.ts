import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../../../users/src/entities/user.entity';
import { Station } from '../../../stations/src/entities/station.entity';
import { Charger } from '../../../chargers/src/entities/charger.entity';
import { Connector } from '../../../chargers/src/entities/connector.entity';
import { DeviceTransaction } from '../../../sessions/src/entities/device-transaction.entity';
import { RfidTag } from '../../../fleet/src/entities/rfid-tag.entity';

@Injectable()
export class VendorDashboardRepository {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Station) private readonly stationRepo: Repository<Station>,
    @InjectRepository(Charger) private readonly chargerRepo: Repository<Charger>,
    @InjectRepository(Connector) private readonly connectorRepo: Repository<Connector>,
    @InjectRepository(DeviceTransaction) private readonly deviceTransactionRepo: Repository<DeviceTransaction>,
    @InjectRepository(RfidTag) private readonly rfidTagRepo: Repository<RfidTag>,
  ) {}

  async countRfidUsersByVendor(vendorId: number): Promise<number> {
    return this.userRepo
      .createQueryBuilder('u')
      .innerJoin(RfidTag, 'tag', 'tag.userId = u.id')
      .where('tag.vendorId = :vendorId', { vendorId })
      .getCount();
  }

  countStationsByVendor(vendorId: number) {
    return this.stationRepo.count({ where: { vendorId } });
  }

  countChargersByVendor(vendorId: number, status?: string) {
    return this.chargerRepo.count({ where: { vendorId, ...(status ? { status: status as any } : {}) } });
  }

  countConnectorsByVendorAndStatus(vendorId: number, statuses?: string[]) {
    const qb = this.connectorRepo
      .createQueryBuilder('c')
      .innerJoin('c.charger', 'charger')
      .where('charger.vendorId = :vendorId', { vendorId });
    if (statuses && statuses.length) qb.andWhere('c.status IN (:...statuses)', { statuses });
    return qb.getCount();
  }

  findChargerIdsByVendor(vendorId: number) {
    return this.chargerRepo.find({ where: { vendorId }, select: { id: true, chargerId: true } });
  }

  async sumDeviceTransactionField(chargerIds: number[], field: 'price' | 'totalWh', startDate?: Date, endDate?: Date, status?: number): Promise<number> {
    if (!chargerIds.length) return 0;
    const qb = this.deviceTransactionRepo
      .createQueryBuilder('dt')
      .select(`SUM(dt.${field})`, 'total')
      .where('dt.chargerRef IN (:...chargerIds)', { chargerIds });
    if (status !== undefined) qb.andWhere('dt.status = :status', { status });
    if (startDate && endDate) qb.andWhere('dt.createdAt >= :startDate AND dt.createdAt <= :endDate', { startDate, endDate });
    const raw = await qb.getRawOne<{ total: string | null }>();
    return Number(raw?.total) || 0;
  }

  async countDeviceTransactions(chargerIds: number[], startDate: Date, endDate: Date, status: number): Promise<number> {
    if (!chargerIds.length) return 0;
    return this.deviceTransactionRepo
      .createQueryBuilder('dt')
      .where('dt.chargerRef IN (:...chargerIds)', { chargerIds })
      .andWhere('dt.status = :status', { status })
      .andWhere('dt.createdAt >= :startDate AND dt.createdAt <= :endDate', { startDate, endDate })
      .getCount();
  }

  findRecentTransactions(chargerIds: number[], limit: number) {
    if (!chargerIds.length) return Promise.resolve([]);
    return this.deviceTransactionRepo.find({
      where: { chargerRef: In(chargerIds) },
      relations: { charger: { station: true }, vehicle: true, fleetUser: { fleetUsers: true }, user: true },
      order: { id: 'DESC' },
      take: limit,
    });
  }

  findFaultedConnectorsByVendor(vendorId: number) {
    const availableStatuses = ['Available', 'Engaged', 'Preparing', 'Charging', 'Finishing'];
    return this.connectorRepo
      .createQueryBuilder('connector')
      .innerJoinAndSelect('connector.charger', 'charger')
      .innerJoinAndSelect('charger.station', 'station')
      .where('charger.vendorId = :vendorId', { vendorId })
      .andWhere('connector.status NOT IN (:...availableStatuses)', { availableStatuses })
      .orderBy('connector.updatedAt', 'DESC')
      .getMany();
  }
}
