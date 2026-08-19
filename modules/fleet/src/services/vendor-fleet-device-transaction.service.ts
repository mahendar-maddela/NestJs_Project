import { Injectable } from '@nestjs/common';
import { AdminDeviceTransactionRepository } from '../../../sessions/src/repositories/admin-device-transaction.repository';

/** Mirrors `controllers/vendors/Fleet/deviceTransactionController.js`. */
@Injectable()
export class VendorFleetDeviceTransactionService {
  constructor(private readonly repo: AdminDeviceTransactionRepository) {}

  async getAllFleetDeviceTransactions(
    fleetId: number,
    vendorId: number,
    clientId: number,
    search: string | undefined,
    chargerId: string | undefined,
    stationId: string | undefined,
    page: number,
    limit: number,
  ) {
    const skip = (page - 1) * limit;
    const [rows, count] = await this.repo.findAndCountByFleet(
      fleetId,
      clientId,
      { search, chargerRef: chargerId ? Number(chargerId) : undefined, vendorId, stationId: stationId ? Number(stationId) : undefined },
      skip,
      limit,
    );

    return {
      success: true,
      message: 'Device transactions fetched successfully',
      data: rows,
      pagination: { totalPages: Math.ceil(count / limit), page },
    };
  }
}
