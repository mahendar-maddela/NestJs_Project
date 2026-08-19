import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CpoSettlement } from '../entities/cpo-settlement.entity';
import { Charger } from '../../../chargers/src/entities/charger.entity';
import { Vendor } from '../../../vendors/src/entities/vendor.entity';

/** Mirrors `controllers/vendors/settlementTransactionController.js`. */
@Injectable()
export class VendorCpoSettlementRepository {
  constructor(
    @InjectRepository(CpoSettlement) private readonly settlementRepo: Repository<CpoSettlement>,
    @InjectRepository(Charger) private readonly chargerRepo: Repository<Charger>,
    @InjectRepository(Vendor) private readonly vendorRepo: Repository<Vendor>,
  ) {}

  findAndCountDueSettlements(vendorId: number, skip: number, take: number) {
    return this.settlementRepo.findAndCount({
      where: { vendorId, status: 'Due' },
      relations: { charger: true },
      select: {
        id: true,
        chargerId: true,
        fromDate: true,
        totalAmount: true,
        status: true,
        netPayble: true,
        transactionFee: true,
        createdAt: true,
        charger: { id: true, chargerId: true, stationId: true },
      },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  async findChargersWithSettlements(vendorId: number) {
    return this.chargerRepo.find({
      where: { vendorId },
      select: { id: true, chargerId: true, stationId: true, createdAt: true },
      relations: { station: true, cpoSettlements: true },
      order: { createdAt: 'DESC' },
    });
  }

  findChargerByIdAndVendor(id: number, vendorId: number) {
    return this.chargerRepo.findOne({ where: { id, vendorId }, select: { id: true, chargerId: true } });
  }

  findAndCountSettledByCharger(chargerId: number, skip: number, take: number) {
    return this.settlementRepo.findAndCount({
      where: { chargerId, status: 'Settled' },
      relations: { charger: true },
      select: {
        id: true,
        chargerId: true,
        totalAmount: true,
        transactionFee: true,
        paidAmount: true,
        settledDate: true,
        fromDate: true,
        toDate: true,
        netPayble: true,
        refNo: true,
        charger: { id: true, chargerId: true },
      },
      order: { settledDate: 'DESC' },
      skip,
      take,
    });
  }

  // Legacy's query here is unusable as written: it filters `Vendor.vendorId` (not a column on
  // Vendor) and its raw SQL uses Postgres-style double-quoted identifiers against a MySQL
  // database, so it would fail on every call. Evident intent — "CPO List" summary of the sub-CPO
  // vendors under this vendor — implemented against `parentVendorId` (the actual self-referential
  // grouping column, used the same way for vendor employees elsewhere in this codebase) with
  // aggregated totals from CpoSettlements.totalAmount (the real column; legacy's `finalAmount`
  // doesn't exist on CpoSettlement).
  findVendorSettlementSummaries(vendorId: number) {
    return this.vendorRepo
      .createQueryBuilder('vendor')
      .select(['vendor.id', 'vendor.vendor_name'])
      .addSelect('(SELECT COUNT(DISTINCT cs.chargerId) FROM CpoSettlements cs WHERE cs.vendorId = vendor.id)', 'chargersCount')
      .addSelect('(SELECT COALESCE(SUM(cs.totalAmount), 0) FROM CpoSettlements cs WHERE cs.vendorId = vendor.id)', 'totalAmount')
      .where('vendor.parentVendorId = :vendorId', { vendorId })
      .orderBy('vendor.vendor_name', 'ASC')
      .getRawMany();
  }
}
