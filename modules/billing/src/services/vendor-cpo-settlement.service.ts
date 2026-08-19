import { Injectable, NotFoundException } from '@nestjs/common';
import { VendorCpoSettlementRepository } from '../repositories/vendor-cpo-settlement.repository';

/** Mirrors `controllers/vendors/settlementTransactionController.js`. */
@Injectable()
export class VendorCpoSettlementService {
  constructor(private readonly repo: VendorCpoSettlementRepository) {}

  async getDueSettlements(vendorId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [rows, count] = await this.repo.findAndCountDueSettlements(vendorId, skip, limit);
    return {
      success: true,
      data: rows,
      pagination: { totalCount: count, currentPage: page, totalPages: Math.ceil(count / limit) },
    };
  }

  async getChargerList(vendorId: number) {
    const chargers = await this.repo.findChargersWithSettlements(vendorId);

    const result = chargers.map((charger) => {
      const settlements = charger.cpoSettlements ?? [];
      const totalAmount = settlements.reduce((sum, s) => sum + parseFloat(s.totalAmount ?? '0'), 0);
      const settledAmount = settlements
        .filter((s) => s.status === 'Settled')
        .reduce((sum, s) => sum + Number(s.totalAmount ?? 0), 0);
      const dueAmount = settlements
        .filter((s) => s.status === 'Due')
        .reduce((sum, s) => sum + Number(s.totalAmount ?? 0), 0);

      return { ...charger, totalAmount, settledAmount, dueAmount };
    });

    return { success: true, message: 'fetched successfull', data: result };
  }

  async getChargerDetails(chargerId: number, vendorId: number, page: number, limit: number) {
    const charger = await this.repo.findChargerByIdAndVendor(chargerId, vendorId);
    if (!charger) {
      throw new NotFoundException({ success: false, message: 'Charger not found' });
    }

    const skip = (page - 1) * limit;
    const [details, count] = await this.repo.findAndCountSettledByCharger(charger.id, skip, limit);

    return {
      success: true,
      charger,
      data: details,
      pagination: { totalCount: count, currentPage: page, totalPages: Math.ceil(count / limit) },
    };
  }

  async getVendorSettlements(vendorId: number) {
    const vendors = await this.repo.findVendorSettlementSummaries(vendorId);
    return { success: true, data: vendors };
  }
}
