import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { ClientAmc } from '../entities/client-amc.entity';
import { ClientChargerAmc } from '../entities/client-charger-amc.entity';
import { Staff } from '../../../clients/src/entities/staff.entity';
import { ClientDetails } from '../../../clients/src/entities/client-details.entity';
import { Charger } from '../../../chargers/src/entities/charger.entity';

/** Mirrors `controllers/suparAdmin/clientAmcController.js`. */
@Injectable()
export class SuperAdminClientAmcRepository {
  constructor(
    @InjectRepository(ClientAmc) private readonly clientAmcRepo: Repository<ClientAmc>,
    @InjectRepository(ClientChargerAmc) private readonly clientChargerAmcRepo: Repository<ClientChargerAmc>,
    @InjectRepository(Staff) private readonly staffRepo: Repository<Staff>,
    @InjectRepository(ClientDetails) private readonly clientDetailsRepo: Repository<ClientDetails>,
    @InjectRepository(Charger) private readonly chargerRepo: Repository<Charger>,
  ) {}

  async findAllClientsWithLatestAmc(search: string | undefined, status: string | undefined) {
    const qb = this.staffRepo
      .createQueryBuilder('staff')
      .select(['staff.id', 'staff.empId', 'staff.clientToken'])
      .addSelect('(SELECT ca.endDate FROM ClientAmcs ca WHERE ca.clientId = staff.id ORDER BY ca.createdAt DESC LIMIT 1)', 'latestAmcEndDate')
      .leftJoin('staff.clientDetails', 'clientDetails')
      .addSelect(['clientDetails.id', 'clientDetails.brandName'])
      .leftJoinAndMapMany(
        'staff.clientAmcs',
        ClientAmc,
        'clientAmcs',
        'clientAmcs.clientId = staff.id AND clientAmcs.id = (SELECT ca.id FROM ClientAmcs ca WHERE ca.clientId = staff.id ORDER BY ca.createdAt DESC LIMIT 1)',
      )
      .where('staff.clientToken IS NOT NULL');

    if (search) {
      qb.andWhere('clientDetails.brandName LIKE :s', { s: `%${search}%` });
    }
    if (status === 'Active') {
      qb.andWhere('clientAmcs.status = :status', { status: 'Active' }).andWhere('clientAmcs.endDate >= :now', { now: new Date() });
    } else if (status === 'Expired') {
      qb.andWhere('clientAmcs.endDate < :now', { now: new Date() });
    }

    qb.orderBy('latestAmcEndDate IS NULL', 'ASC').addOrderBy('latestAmcEndDate', 'ASC');

    return qb.getMany();
  }

  findLatestAmcByClientId(clientId: number) {
    return this.clientAmcRepo.findOne({
      where: { clientId },
      relations: { client: { clientDetails: true } },
      order: { createdAt: 'DESC' },
    });
  }

  findLatestAmcByClient(clientId: number) {
    return this.clientAmcRepo.findOne({ where: { clientId }, order: { createdAt: 'DESC' } });
  }

  async expireActiveAmcsForClient(clientId: number) {
    await this.clientAmcRepo.update({ clientId, status: 'Active' }, { status: 'Expired' });
  }

  createAmc(data: Partial<ClientAmc>) {
    return this.clientAmcRepo.save(this.clientAmcRepo.create(data));
  }

  countClientDetails() {
    return this.clientDetailsRepo.count();
  }

  countClientAmcsByStatus(status: string) {
    return this.clientAmcRepo.count({ where: { status: status as any } });
  }

  // Legacy's `distinct: true, col: 'clientId'` combined with a correlated-subquery `where` on
  // "createdAt = MAX(createdAt) for this clientId" counts each client's most-recent AMC only
  // when that most-recent one is Expired.
  countExpiredAmcsLatestPerClient() {
    return this.clientAmcRepo
      .createQueryBuilder('amc')
      .where('amc.status = :status', { status: 'Expired' })
      .andWhere('amc.createdAt = (SELECT MAX(ca2.createdAt) FROM ClientAmcs ca2 WHERE ca2.clientId = amc.clientId)')
      .select('COUNT(DISTINCT amc.clientId)', 'cnt')
      .getRawOne<{ cnt: string }>()
      .then((r) => Number(r?.cnt ?? 0));
  }

  countClientChargerAmcsByStatus(status: string) {
    return this.clientChargerAmcRepo.count({ where: { status: status as any } });
  }

  countExpiredChargerAmcsLatestPerCharger() {
    return this.clientChargerAmcRepo
      .createQueryBuilder('cca')
      .where('cca.status = :status', { status: 'Expired' })
      .andWhere('cca.createdAt = (SELECT MAX(ca2.createdAt) FROM ClientChargerAmcs ca2 WHERE ca2.chargerId = cca.chargerId)')
      .select('COUNT(DISTINCT cca.chargerId)', 'cnt')
      .getRawOne<{ cnt: string }>()
      .then((r) => Number(r?.cnt ?? 0));
  }

  countChargers() {
    return this.chargerRepo.count();
  }

  countClientAmcsExpiringBetween(startDate: Date, endDate: Date) {
    return this.clientAmcRepo.count({ where: { status: 'Active', endDate: Between(startDate, endDate) } });
  }

  countClientChargerAmcsExpiringBetween(startDate: Date, endDate: Date) {
    return this.clientChargerAmcRepo.count({ where: { status: 'Active', endDate: Between(startDate, endDate) } });
  }

  countClientChargerAmcsByClientAndStatus(clientId: number, status: string) {
    return this.clientChargerAmcRepo.count({ where: { clientId, status: status as any } });
  }

  countExpiredChargerAmcsLatestPerChargerForClient(clientId: number) {
    return this.clientChargerAmcRepo
      .createQueryBuilder('cca')
      .where('cca.clientId = :clientId', { clientId })
      .andWhere('cca.status = :status', { status: 'Expired' })
      .andWhere('cca.endDate = (SELECT MAX(ca2.endDate) FROM ClientChargerAmcs ca2 WHERE ca2.chargerId = cca.chargerId)')
      .getCount();
  }

  countClientChargerAmcsExpiringBetweenForClient(clientId: number, startDate: Date, endDate: Date) {
    return this.clientChargerAmcRepo
      .createQueryBuilder('cca')
      .where('cca.clientId = :clientId', { clientId })
      .andWhere('cca.status = :status', { status: 'Active' })
      .andWhere('cca.endDate BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getCount();
  }

  countChargersByClientAndPowerType(clientId: number, powerType: string) {
    return this.chargerRepo.count({ where: { clientId, powerType: powerType as any } });
  }
}
