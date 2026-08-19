import { Injectable } from '@nestjs/common';
import { FleetDeviceTransactionRepository, FleetDeviceTransactionFilters } from '../repositories/fleet-device-transaction.repository';

/** Mirrors `controllers/Fleet/deviceTransactionsController.js`. */
@Injectable()
export class FleetDeviceTransactionService {
  constructor(private readonly repo: FleetDeviceTransactionRepository) {}

  async getAllDeviceTransactions(fleetId: number, filters: FleetDeviceTransactionFilters, page: number, limit: number) {
    const { rows, count, page: resolvedPage } = await this.repo.findAndCountByFleet(fleetId, filters, page, limit);

    return {
      success: true,
      message: 'Device transactions fetched successfully',
      data: rows,
      pagination: { totalItems: count, totalPages: Math.ceil(count / limit), currentPage: resolvedPage },
    };
  }
}
