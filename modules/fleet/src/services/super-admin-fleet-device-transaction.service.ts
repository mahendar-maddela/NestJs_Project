import { Injectable } from '@nestjs/common';
import { AdminDeviceTransactionRepository } from '../../../sessions/src/repositories/admin-device-transaction.repository';

/** Mirrors `controllers/suparAdmin/fleet/deviceTransactionController.js`. Cross-client: no clientId scope. */
@Injectable()
export class SuperAdminFleetDeviceTransactionService {
  constructor(private readonly repo: AdminDeviceTransactionRepository) {}

  async getDeviceTransactionsByFleetId(
    fleetId: number,
    filters: { search?: string; chargerId?: string; vendorId?: string; stationId?: string },
    page: number,
    limit: number,
  ) {
    const skip = (page - 1) * limit;
    const [rows, count] = await this.repo.findAndCountByFleet(
      fleetId,
      undefined,
      {
        search: filters.search,
        chargerRef: filters.chargerId ? Number(filters.chargerId) : undefined,
        vendorId: filters.vendorId ? Number(filters.vendorId) : undefined,
        stationId: filters.stationId ? Number(filters.stationId) : undefined,
      },
      skip,
      limit,
    );

    return {
      success: true,
      message: 'Device transactions fetched successfully',
      data: rows,
      pagination: { totalPages: Math.ceil(count / limit), page, total: count, limit },
    };
  }
}
