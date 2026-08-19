import { Injectable, NotFoundException } from '@nestjs/common';
import { AdminCpoAmcRepository } from '../repositories/admin-cpo-amc.repository';
import { RenewCpoAmcDto } from '../dto/admin-cpo-amc.dto';

const STATUS_ORDER: Record<string, number> = { Expired: 0, Active: 1 };

/** Mirrors `controllers/admin/cpoAmcController.js`. */
@Injectable()
export class AdminCpoAmcService {
  constructor(private readonly repo: AdminCpoAmcRepository) {}

  async getCposWithUpcomingOrExpiredAmcs(clientId: number) {
    const today = new Date();
    const oneMonthLater = new Date();
    oneMonthLater.setMonth(today.getMonth() + 1);

    const vendors = await this.repo.findVendors(clientId);
    if (!vendors.length) {
      return { success: true, message: 'Vendors with upcoming & expired AMCs fetched successfully', data: [] };
    }

    const amcs = await this.repo.findUpcomingOrExpiredAmcsForVendors(
      vendors.map((v) => v.id),
      today,
      oneMonthLater,
    );

    const amountByVendor = new Map<number, number>();
    for (const amc of amcs) {
      amountByVendor.set(amc.vendorId, (amountByVendor.get(amc.vendorId) || 0) + Number(amc.amount || 0));
    }

    const data = vendors
      .filter((v) => amountByVendor.has(v.id))
      .map((v) => ({
        vendorId: v.id,
        vendor_name: v.vendor_name,
        vendorUniqueId: v.vendorUniqueId,
        totalAmcAmount: amountByVendor.get(v.id) || 0,
      }));

    return { success: true, message: 'Vendors with upcoming & expired AMCs fetched successfully', data };
  }

  async getCpoAmcExpiredListById(vendorId: number, clientId: number) {
    const chargers = await this.repo.findChargersByVendor(vendorId, clientId);
    if (!chargers.length) {
      return { success: true, message: 'CPO AMCs with upcoming & expired fetched successfully', data: [] };
    }

    const amcs = await this.repo.findLatestAmcsByChargerIds(chargers.map((c) => c.id));
    const latestByCharger = new Map<number, (typeof amcs)[number]>();
    for (const amc of amcs) {
      if (!latestByCharger.has(amc.chargerId)) latestByCharger.set(amc.chargerId, amc);
    }

    const rows = chargers
      .filter((c) => latestByCharger.has(c.id))
      .map((c) => ({
        id: c.id,
        chargerId: c.chargerId,
        station: c.station ? { id: c.station.id, name: c.station.name } : null,
        cpoAmc: [latestByCharger.get(c.id)],
      }));

    const sorted = rows.sort((a, b) => {
      const amcA = a.cpoAmc[0];
      const amcB = b.cpoAmc[0];
      const aStatus = STATUS_ORDER[amcA?.status ?? ''] ?? 2;
      const bStatus = STATUS_ORDER[amcB?.status ?? ''] ?? 2;
      if (aStatus !== bStatus) return aStatus - bStatus;
      return (amcA?.endDate ? new Date(amcA.endDate).getTime() : 0) - (amcB?.endDate ? new Date(amcB.endDate).getTime() : 0);
    });

    return { success: true, message: 'CPO AMCs with upcoming & expired fetched successfully', data: sorted };
  }

  async renewCpoAmc(id: number, clientId: number, dto: RenewCpoAmcDto) {
    const oldAmc = await this.repo.findById(id, clientId);
    if (!oldAmc) {
      throw new NotFoundException({ success: false, message: 'AMC not found' });
    }

    await this.repo.expireAmc(id, new Date());

    const newAmc = await this.repo.createAmc({
      chargerId: oldAmc.chargerId,
      vendorId: oldAmc.vendorId,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      chargeType: dto.chargeType,
      amount: String(dto.amount),
      status: 'Active',
      paidDate: new Date(),
      renew: false,
      clientId,
    });

    return { success: true, message: 'AMC renewed successfully', data: newAmc };
  }

  async getAllAmcByChargerId(chargerId: number, clientId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [rows, count] = await this.repo.findAndCountByCharger(chargerId, clientId, skip, limit);

    return {
      success: true,
      message: 'Charger wise amc fetched successfully',
      deviceTransactions: rows,
      pagination: { totalPages: Math.ceil(count / limit), page },
    };
  }
}
