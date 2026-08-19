import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { CpoSettlement } from '../entities/cpo-settlement.entity';
import { Vendor } from '../../../vendors/src/entities/vendor.entity';
import { Charger } from '../../../chargers/src/entities/charger.entity';

@Injectable()
export class AdminCpoSettlementRepository {
  constructor(
    @InjectRepository(CpoSettlement) private readonly settlementRepo: Repository<CpoSettlement>,
    @InjectRepository(Vendor) private readonly vendorRepo: Repository<Vendor>,
    @InjectRepository(Charger) private readonly chargerRepo: Repository<Charger>,
  ) {}

  async findVendorsWithDueTotalsAndChargerCount(clientId: number) {
    return this.vendorRepo
      .createQueryBuilder('vendor')
      .select(['vendor.id', 'vendor.vendorUniqueId', 'vendor.vendor_name'])
      .addSelect(
        `(SELECT SUM(cs.netPayble) FROM CpoSettlements AS cs WHERE cs.vendorId = vendor.id AND cs.status = 'Due')`,
        'totalAmount',
      )
      .addSelect(`(SELECT COUNT(*) FROM Chargers AS ch WHERE ch.vendorId = vendor.id)`, 'chargersCount')
      .where('vendor.clientId = :clientId', { clientId })
      .orderBy('vendor.id', 'DESC')
      .getRawMany();
  }

  async findAndCountDueSettlements(vendorId: number, clientId: number, skip: number, take: number) {
    return this.settlementRepo.findAndCount({
      where: { vendorId, clientId, status: 'Due' },
      relations: { charger: true },
      select: { id: true, fromDate: true, totalAmount: true, netPayble: true, status: true, transactionFee: true },
      skip,
      take,
    });
  }

  async findChargersWithSettledTotals(vendorId: number, clientId: number) {
    return this.chargerRepo
      .createQueryBuilder('charger')
      .leftJoinAndSelect('charger.station', 'station')
      .addSelect(
        `(SELECT SUM(cs.netPayble) FROM CpoSettlements AS cs WHERE cs.chargerId = charger.id AND cs.status = 'Settled')`,
        'totalSettledAmount',
      )
      .where('charger.vendorId = :vendorId AND charger.clientId = :clientId', { vendorId, clientId })
      .orderBy('charger.id', 'DESC')
      .getRawAndEntities();
  }

  async findAndCountByCharger(chargerId: number, clientId: number, skip: number, take: number) {
    return this.settlementRepo.findAndCount({
      where: { chargerId, clientId },
      relations: { charger: true },
      order: { id: 'DESC' },
      skip,
      take,
    });
  }

  findById(id: number, clientId: number) {
    return this.settlementRepo.findOne({ where: { id, clientId } });
  }

  async updateSettlement(id: number, data: QueryDeepPartialEntity<CpoSettlement>) {
    await this.settlementRepo.update(id, data);
  }

  findManyByIds(ids: number[], clientId: number) {
    if (!ids.length) return Promise.resolve([]);
    return this.settlementRepo.find({ where: { id: In(ids), clientId } });
  }

  /** Scoped to clientId (unlike legacy's bulk update, which omits it) — CLAUDE.md forbids cross-tenant queries. */
  async bulkUpdateSettlements(ids: number[], clientId: number, data: QueryDeepPartialEntity<CpoSettlement>) {
    await this.settlementRepo.update({ id: In(ids), clientId }, data);
  }
}
