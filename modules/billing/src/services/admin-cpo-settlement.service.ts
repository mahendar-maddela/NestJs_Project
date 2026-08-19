import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AdminCpoSettlementRepository } from '../repositories/admin-cpo-settlement.repository';
import { SettleNowDto, SettleNowBulkDto } from '../dto/admin-cpo-settlement.dto';

function mergeDateWithCurrentTime(dateStr: string): Date {
  const now = new Date();
  const finalDate = new Date(dateStr);
  finalDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
  return finalDate;
}

/** Mirrors `controllers/admin/cpoSettlementController.js` (excluding the `generateCpoSettlement` cron job). */
@Injectable()
export class AdminCpoSettlementService {
  constructor(private readonly repo: AdminCpoSettlementRepository) {}

  async getCpoList(clientId: number) {
    const vendors = await this.repo.findVendorsWithDueTotalsAndChargerCount(clientId);
    const data = vendors.map((v: any) => ({
      id: v.vendor_id,
      vendorUniqueId: v.vendor_vendorUniqueId,
      vendor_name: v.vendor_vendor_name,
      totalAmount: v.totalAmount,
      chargersCount: v.chargersCount,
    }));
    return { success: true, data };
  }

  async getVendorDueSettlementDetails(vendorId: number, clientId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [rows, count] = await this.repo.findAndCountDueSettlements(vendorId, clientId, skip, limit);
    return {
      success: true,
      message: 'vendor due amount fetched',
      data: rows,
      pagination: { totalPages: Math.ceil(count / limit), page },
    };
  }

  async getVendorChargersSettlementDetails(vendorId: number, clientId: number) {
    const { entities, raw } = await this.repo.findChargersWithSettledTotals(vendorId, clientId);
    const data = entities.map((charger, i) => ({ ...charger, totalSettledAmount: raw[i]?.totalSettledAmount ?? null }));
    return { success: true, message: 'Vendor due amount fetched', data };
  }

  async getSingleChargerSettlementDetails(chargerId: number, clientId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [rows, count] = await this.repo.findAndCountByCharger(chargerId, clientId, skip, limit);
    return {
      success: true,
      message: 'Device transactions fetched successfully',
      deviceTransactions: rows,
      pagination: { totalPages: Math.ceil(count / limit), page },
    };
  }

  async settleNow(settlementId: number, clientId: number, dto: SettleNowDto) {
    if (!dto.settledDate) {
      throw new BadRequestException({ message: 'Settled Date is required' });
    }

    const settlement = await this.repo.findById(settlementId, clientId);
    if (!settlement) {
      throw new NotFoundException({ message: 'Settlement not found' });
    }

    const finalDate = mergeDateWithCurrentTime(dto.settledDate);
    await this.repo.updateSettlement(settlementId, { status: 'Settled', settledDate: finalDate });

    return { success: true, message: 'Settlement marked as settled successfully', data: { ...settlement, status: 'Settled', settledDate: finalDate } };
  }

  async settleNowBulk(clientId: number, dto: SettleNowBulkDto) {
    if (!dto.settledDate) {
      throw new BadRequestException({ message: 'Settled Date is required' });
    }
    if (!Array.isArray(dto.settlementIds) || dto.settlementIds.length === 0) {
      throw new BadRequestException({ message: 'Settlement IDs are required' });
    }

    const settlements = await this.repo.findManyByIds(dto.settlementIds, clientId);
    if (settlements.length === 0) {
      throw new NotFoundException({ message: 'No settlements found' });
    }

    const finalDate = mergeDateWithCurrentTime(dto.settledDate);
    await this.repo.bulkUpdateSettlements(dto.settlementIds, clientId, {
      status: 'Settled',
      refNo: dto.refNo,
      settledDate: finalDate,
    });

    return { success: true, message: 'Settlements marked as settled successfully', updatedIds: dto.settlementIds };
  }
}
