import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { VendorChargerRepository } from '../repositories/vendor-charger.repository';

/** Mirrors `controllers/vendors/chargerController.js`. */
@Injectable()
export class VendorChargerService {
  constructor(private readonly repo: VendorChargerRepository) {}

  async getChargerById(chargerId: string, vendorId: number) {
    // Legacy has no vendor-ownership check on this lookup — scoped here to prevent
    // cross-tenant access, reusing legacy's exact "Charger not found" 404 shape.
    const charger = await this.repo.findChargerByBusinessIdAndVendor(chargerId, vendorId);
    if (!charger) {
      throw new NotFoundException({ message: 'Charger not found' });
    }
    return { success: true, message: 'Charger fetched successfully', data: charger };
  }

  async getAllChargersByStationId(stationId: number, vendorId: number) {
    // Legacy has no vendor-ownership check on this lookup — scoped here to prevent
    // cross-tenant access; an out-of-tenant station now yields the existing empty-result 404.
    const chargers = await this.repo.findChargersByStationAndVendor(stationId, vendorId);
    if (!chargers.length) {
      throw new NotFoundException({ message: 'No chargers found for this station' });
    }

    const chargerIds = chargers.map((c) => c.chargerId);
    const specs = await this.repo.findSpecificationsByChargerIds(chargerIds);

    const data = chargers.map((charger) => ({
      ...charger,
      chargerSpecification: specs.find((s) => s.chargerId === charger.chargerId) ?? null,
    }));

    return { success: true, message: 'Chargers fetched successfully', data };
  }

  async getAllDeviceTransactionByChargerId(chargerBusinessId: string, vendorId: number, connector: string | undefined, page: number, limit: number) {
    // Legacy queries DeviceTransactions by the raw chargerId param with no vendor-ownership
    // check at all — scoped here: if the charger isn't this vendor's, return an empty page
    // instead of leaking another tenant's transactions (keeps legacy's always-200 shape).
    const owned = await this.repo.findChargerRefByBusinessIdAndVendor(chargerBusinessId, vendorId);
    const skip = (page - 1) * limit;
    const { rows, count } = owned ? await this.repo.findAndCountDeviceTransactions(chargerBusinessId, connector, skip, limit) : { rows: [], count: 0 };

    return {
      success: true,
      message: 'Device Transactions fetched successfully',
      data: rows,
      pagination: { totalPages: Math.ceil(count / limit), page },
    };
  }

  async chargerDeviceLogs(chargerId: string, vendorId: number, page: number, limit: number) {
    // Legacy scopes by chargerId only (no vendorId) — scoped here to prevent cross-tenant
    // access, reusing legacy's exact "Charger not found" 404 shape (used by legacy for the
    // genuinely-missing case).
    const charger = await this.repo.findChargerRefByBusinessIdAndVendor(chargerId, vendorId);
    if (!charger) {
      throw new NotFoundException({ success: false, message: 'Charger not found' });
    }

    const skip = (page - 1) * limit;
    const { rows, count } = await this.repo.findAndCountDeviceLogs(charger.chargerId, skip, limit);

    return {
      success: true,
      message: 'Device logs fetched successfully',
      data: rows,
      pagination: { currentPage: page, totalPages: Math.ceil(count / limit), totalCount: count, itemsPerPage: limit },
    };
  }

  async getLogsDateWise(chargerId: string, vendorId: number, from: string | undefined, to: string | undefined) {
    if (!from || !to) {
      throw new BadRequestException({ message: 'Both "from" and "to" query parameters are required.' });
    }

    const fromDate = new Date(from);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    const charger = await this.repo.findChargerRefByBusinessIdAndVendor(chargerId, vendorId);
    // Legacy dereferences `charger.chargerId` unconditionally here, which would throw on a
    // missing/foreign charger — implemented as the evidently-intended 404 instead of a crash.
    if (!charger) {
      throw new NotFoundException({ message: 'Charger not found' });
    }

    const logs = await this.repo.findLogsInRange(charger.chargerId, fromDate, toDate);
    return { success: true, message: 'Date wise Logs fetched successfully', logs };
  }

  async getAllChargersVendor(vendorId: number, page: number | null, limit: number | null, powerType?: string, search?: string, stationId?: string) {
    if (!vendorId) {
      throw new BadRequestException({ message: 'Vendor ID missing' });
    }

    if (!page && !limit) {
      const chargers = await this.repo.findChargersForVendor(vendorId, powerType, search, stationId);
      return { success: true, message: 'Chargers fetched successfully', data: chargers };
    }

    const skip = (page! - 1) * limit!;
    const { rows, count } = await this.repo.findAndCountChargersForVendor(vendorId, powerType, search, stationId, skip, limit!);

    return {
      success: true,
      message: 'Chargers fetched successfully',
      data: rows,
      pagination: { totalPages: Math.ceil(count / limit!), total: count, page },
    };
  }
}
