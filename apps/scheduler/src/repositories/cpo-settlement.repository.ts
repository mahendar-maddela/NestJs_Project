import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Vendor } from 'modules/vendors/src/entities/vendor.entity';
import { Charger } from 'modules/chargers/src/entities/charger.entity';
import { DeviceTransaction } from 'modules/sessions/src/entities/device-transaction.entity';
import { CpoSettlement } from 'modules/billing/src/entities/cpo-settlement.entity';

@Injectable()
export class CpoSettlementRepository {
  constructor(
    @InjectRepository(Vendor) private readonly vendorRepo: Repository<Vendor>,
    @InjectRepository(Charger) private readonly chargerRepo: Repository<Charger>,
    @InjectRepository(DeviceTransaction) private readonly deviceTransactionRepo: Repository<DeviceTransaction>,
    @InjectRepository(CpoSettlement) private readonly cpoSettlementRepo: Repository<CpoSettlement>,
  ) {}

  findAllVendors() {
    return this.vendorRepo.find({ select: { id: true, vendor_name: true, transFeePerc: true, clientId: true } });
  }

  findChargersByVendor(vendorId: number) {
    return this.chargerRepo.find({ where: { vendorId }, select: { id: true, chargerId: true, clientId: true } });
  }

  /** Mirrors the `status:1, stopDate: {between: [fromDate, toDate]}` filter. */
  findSuccessfulTransactions(chargerRef: number, fromDate: Date, toDate: Date) {
    return this.deviceTransactionRepo.find({ where: { chargerRef, status: 1, stopDate: Between(fromDate, toDate) } });
  }

  findExistingSettlement(vendorId: number, chargerId: number, fromDate: Date, toDate: Date) {
    return this.cpoSettlementRepo.findOne({ where: { vendorId, chargerId, fromDate, toDate } });
  }

  createSettlement(data: Partial<CpoSettlement>) {
    return this.cpoSettlementRepo.save(this.cpoSettlementRepo.create(data));
  }
}
