import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { CpoAmc } from '../entities/cpo-amc.entity';

/** Mirrors `controllers/vendors/amcController.js`. */
@Injectable()
export class VendorCpoAmcRepository {
  constructor(@InjectRepository(CpoAmc) private readonly repo: Repository<CpoAmc>) {}

  findActiveAmcs(vendorId: number, today: Date) {
    return this.repo.find({
      where: { vendorId, status: 'Active', startDate: LessThanOrEqual(today), endDate: MoreThanOrEqual(today) },
      relations: { charger: { station: true } },
      select: {
        charger: { id: true, chargerId: true, station: { id: true, name: true, stationUniqueId: true } },
      },
      order: { startDate: 'ASC' },
    });
  }

  findUpcomingOrExpiredAmcs(vendorId: number, today: Date, oneMonthLater: Date) {
    return this.repo
      .createQueryBuilder('amc')
      .leftJoinAndSelect('amc.charger', 'charger')
      .leftJoinAndSelect('charger.station', 'station')
      .where('amc.vendorId = :vendorId', { vendorId })
      .andWhere(
        `(
          (amc.status = 'Active' AND amc.endDate BETWEEN :today AND :oneMonthLater)
          OR (amc.status = 'Expired' AND amc.chargerId NOT IN (SELECT chargerId FROM CpoAmcs WHERE status = 'Active'))
          OR (amc.status = 'Active' AND amc.endDate < :today)
        )`,
        { today, oneMonthLater },
      )
      .orderBy('amc.startDate', 'ASC')
      .getMany();
  }
}
