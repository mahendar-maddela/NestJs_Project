import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Charger } from '../../../chargers/src/entities/charger.entity';
import { ClientChargerAmc } from '../entities/client-charger-amc.entity';

const LATEST_END_DATE_SQL = `(
  SELECT cca.endDate FROM ClientChargerAmcs AS cca
  WHERE cca.chargerId = charger.id AND cca.clientId = charger.clientId
  ORDER BY cca.endDate DESC, cca.id DESC LIMIT 1
)`;

const LATEST_STATUS_SQL = `(
  SELECT cca.status FROM ClientChargerAmcs AS cca
  WHERE cca.chargerId = charger.id AND cca.clientId = charger.clientId
  ORDER BY cca.endDate DESC, cca.id DESC LIMIT 1
)`;

@Injectable()
export class AdminSoftwareAmcRepository {
  constructor(
    @InjectRepository(Charger) private readonly chargerRepo: Repository<Charger>,
    @InjectRepository(ClientChargerAmc) private readonly clientChargerAmcRepo: Repository<ClientChargerAmc>,
  ) {}

  async findChargersWithLatestAmc(clientId: number, status: string | undefined, skip: number, take: number) {
    const baseQb = this.chargerRepo.createQueryBuilder('charger').where('charger.clientId = :clientId', { clientId });
    if (status) baseQb.andWhere(`${LATEST_STATUS_SQL} = :status`, { status });

    const count = await baseQb.getCount();

    const rows = await baseQb
      .clone()
      .select('charger.id', 'id')
      .addSelect('charger.clientId', 'clientId')
      .addSelect('charger.chargerId', 'chargerId')
      .addSelect('charger.createdAt', 'createdAt')
      .addSelect('charger.powerType', 'powerType')
      .addSelect(LATEST_END_DATE_SQL, 'latestAmcEndDate')
      .addSelect(LATEST_STATUS_SQL, 'latestAmcStatus')
      .orderBy(`${LATEST_END_DATE_SQL} IS NULL`, 'ASC')
      .addOrderBy(LATEST_END_DATE_SQL, 'ASC')
      .offset(skip)
      .limit(take)
      .getRawMany();

    return [rows, count] as const;
  }

  async findLatestAmcsByChargerIds(chargerIds: number[]) {
    if (!chargerIds.length) return [];
    return this.clientChargerAmcRepo.find({
      where: { chargerId: In(chargerIds) },
      select: { id: true, chargerId: true, status: true, startDate: true, endDate: true },
      order: { createdAt: 'DESC' },
    });
  }

  countChargersByPowerType(clientId: number, powerType: 'AC' | 'DC') {
    return this.chargerRepo.count({ where: { clientId, powerType } });
  }

  countOnboardedChargersByPowerType(clientId: number, powerType: 'AC' | 'DC') {
    return this.chargerRepo
      .createQueryBuilder('charger')
      .innerJoin(ClientChargerAmc, 'cca', 'cca.chargerId = charger.id AND cca.status = :onboarded', { onboarded: 'Onboarded' })
      .where('charger.clientId = :clientId AND charger.powerType = :powerType', { clientId, powerType })
      .getCount();
  }

  /** Currently-active AMC (no later AMC has overtaken its endDate) for chargers of the given power type. */
  countActiveChargersByPowerType(clientId: number, powerType: 'AC' | 'DC') {
    return this.chargerRepo
      .createQueryBuilder('charger')
      .where('charger.clientId = :clientId AND charger.powerType = :powerType', { clientId, powerType })
      .andWhere(`EXISTS (SELECT 1 FROM ClientChargerAmcs cca WHERE cca.chargerId = charger.id AND cca.status = 'Active')`)
      .andWhere(
        `NOT EXISTS (
          SELECT 1 FROM ClientChargerAmcs cca2
          WHERE cca2.chargerId = charger.id
          AND cca2.endDate > (
            SELECT MAX(cca3.endDate) FROM ClientChargerAmcs cca3
            WHERE cca3.chargerId = charger.id AND cca3.status = 'Active'
          )
        )`,
      )
      .getCount();
  }

  countExpiredChargersByPowerType(clientId: number, powerType: 'AC' | 'DC') {
    return this.chargerRepo
      .createQueryBuilder('charger')
      .where('charger.clientId = :clientId AND charger.powerType = :powerType', { clientId, powerType })
      .andWhere(`EXISTS (SELECT 1 FROM ClientChargerAmcs cca WHERE cca.chargerId = charger.id AND cca.status = 'Expired')`)
      .andWhere(`NOT EXISTS (SELECT 1 FROM ClientChargerAmcs cca2 WHERE cca2.chargerId = charger.id AND cca2.status = 'Active')`)
      .getCount();
  }
}
