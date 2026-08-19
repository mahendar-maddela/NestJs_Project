import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { CpoAmc } from '../entities/cpo-amc.entity';
import { Vendor } from '../../../vendors/src/entities/vendor.entity';
import { Charger } from '../../../chargers/src/entities/charger.entity';

@Injectable()
export class AdminCpoAmcRepository {
  constructor(
    @InjectRepository(CpoAmc) private readonly cpoAmcRepo: Repository<CpoAmc>,
    @InjectRepository(Vendor) private readonly vendorRepo: Repository<Vendor>,
    @InjectRepository(Charger) private readonly chargerRepo: Repository<Charger>,
  ) {}

  async findVendors(clientId: number) {
    return this.vendorRepo.find({
      where: { clientId },
      select: { id: true, vendor_name: true, vendorUniqueId: true },
    });
  }

  /** AMCs that are unrenewed and either active-and-due-soon, expired, or active-but-overdue. */
  async findUpcomingOrExpiredAmcsForVendors(vendorIds: number[], today: Date, oneMonthLater: Date) {
    if (!vendorIds.length) return [];
    return this.cpoAmcRepo
      .createQueryBuilder('amc')
      .select(['amc.id', 'amc.amount', 'amc.vendorId'])
      .where('amc.vendorId IN (:...vendorIds)', { vendorIds })
      .andWhere('amc.renew = false')
      .andWhere(
        new Brackets((qb) => {
          qb.where('(amc.status = :activeDueSoon AND amc.endDate BETWEEN :today AND :oneMonthLater)', {
            activeDueSoon: 'Active',
            today,
            oneMonthLater,
          })
            .orWhere('amc.status = :expiredStatus', { expiredStatus: 'Expired' })
            .orWhere('(amc.status = :activeOverdue AND amc.endDate < :todayOverdue)', {
              activeOverdue: 'Active',
              todayOverdue: today,
            });
        }),
      )
      .getMany();
  }

  async findChargersByVendor(vendorId: number, clientId: number) {
    return this.chargerRepo.find({
      where: { vendorId, clientId },
      select: { id: true, chargerId: true },
      relations: { station: true },
    });
  }

  async findLatestAmcsByChargerIds(chargerIds: number[]) {
    if (!chargerIds.length) return [];
    return this.cpoAmcRepo.find({
      where: { chargerId: In(chargerIds) },
      order: { endDate: 'DESC' },
    });
  }

  async findAndCountByCharger(chargerId: number, clientId: number, skip: number, take: number) {
    const [rows, count] = await Promise.all([
      this.cpoAmcRepo.find({
        where: { chargerId, clientId },
        relations: { charger: { station: true } },
        order: { id: 'DESC' },
        skip,
        take,
      }),
      this.cpoAmcRepo.count({ where: { chargerId, clientId } }),
    ]);
    return [rows, count] as const;
  }

  findById(id: number, clientId: number) {
    return this.cpoAmcRepo.findOne({ where: { id, clientId } });
  }

  async expireAmc(id: number, renewDate: Date) {
    await this.cpoAmcRepo.update(id, {
      status: 'Expired',
      renew: true,
      renewDate,
    } as QueryDeepPartialEntity<CpoAmc>);
  }

  createAmc(data: Partial<CpoAmc>) {
    return this.cpoAmcRepo.save(this.cpoAmcRepo.create(data));
  }
}
