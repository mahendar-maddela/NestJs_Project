import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { getIstDateRangeInUtc } from '@app/common';
import { VendorDeviceTransactionRepository } from '../repositories/vendor-device-transaction.repository';

@Injectable()
export class VendorDeviceTransactionService {
  constructor(private readonly repo: VendorDeviceTransactionRepository) { }

  async getAllVendorDeviceTransactions(
    vendorId: number,
    page: number,
    limit: number,
    search: string | undefined,
    status: string | undefined,
    stationId: string | undefined,
    chargerId: string | undefined,
  ) {
    const chargers = await this.repo.findChargerIdsByVendor(vendorId);
    if (chargers.length === 0) {
      throw new NotFoundException({ success: false, message: 'No chargers found for the vendor.' });
    }

    const chargerIds = chargers.map((c) => c.id);
    const skip = (page - 1) * limit;
    const { rows, count } = await this.repo.findAndCountForVendor(chargerIds, { search, status, stationId, chargerId }, stationId, skip, limit);

    return {
      success: true,
      message: 'Device transactions fetched successfully',
      data: rows,
      pagination: { totalPages: Math.ceil(count / limit), page, total: count },
    };
  }

  async getDownloadDeviceTransactions(
    vendorId: number,
    stationIdsRaw: string | undefined,
    chargerIdsRaw: string | undefined,
    startDate: string | undefined,
    endDate: string | undefined,
    applyGst: string | undefined,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException({ success: false, message: 'startDate and endDate are required' });
    }
    if (!stationIdsRaw) {
      throw new BadRequestException({ success: false, message: 'stationIds are required' });
    }
    if (!chargerIdsRaw) {
      throw new BadRequestException({ success: false, message: 'chargerIds are required' });
    }

    const stationIds: number[] = JSON.parse(stationIdsRaw);
    const chargerIds: number[] = JSON.parse(chargerIdsRaw);
    const { startDate: startUTC, endDate: endUTC } = getIstDateRangeInUtc(startDate, endDate);

    const transactions = await this.repo.findForDownload(
      { stationIds, chargerIds, startDate: startUTC, endDate: endUTC, applyGst: String(applyGst) === 'true' },
      vendorId,
    );

    return { success: true, message: 'Device transactions fetched successfully for download', data: transactions };
  }
}
