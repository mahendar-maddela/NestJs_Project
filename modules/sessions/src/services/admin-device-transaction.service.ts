import { Injectable } from '@nestjs/common';
import { AdminDeviceTransactionRepository } from '../repositories/admin-device-transaction.repository';
import { DeviceTransactionQueryDto } from '../dto/admin-device-transaction.dto';

/** Mirrors `controllers/admin/deviceTransactionController.js`. */
@Injectable()
export class AdminDeviceTransactionService {
  constructor(private readonly repo: AdminDeviceTransactionRepository) {}

  private async attachNestedData(rows: any[]) {
    const transactionIds = rows.map((r) => r.id).filter(Boolean);
    const fleetIds = rows.map((r) => r.fleetUser?.id).filter((id): id is number => Boolean(id));

    const [detailsByRef, managersByFleet] = await Promise.all([
      this.repo.findLatestTransactionDetailsByRefs(transactionIds),
      this.repo.findFleetManagersByFleetIds(fleetIds),
    ]);

    return rows.map((row) => {
      const detail = detailsByRef.get(row.id);
      const manager = row.fleetUser?.id ? managersByFleet.get(row.fleetUser.id) : undefined;
      return {
        ...row,
        transactionDetails: detail
          ? [{ id: detail.id, transactionId: detail.transactionId, currentImportEv: detail.currentImportEv, powerOffered: detail.powerOffered, voltageEv: detail.voltageEv }]
          : [],
        fleetUser: row.fleetUser
          ? { ...row.fleetUser, fleetUsers: manager ? [manager] : [] }
          : row.fleetUser,
      };
    });
  }

  async getAllDeviceTransactions(clientId: number, query: DeviceTransactionQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 200;
    const skip = (page - 1) * limit;

    const [rows, count] = await this.repo.findAndCountAllTransactions(
      clientId,
      {
        search: query.search,
        chargerRef: query.chargerId ? Number(query.chargerId) : undefined,
        vendorId: query.vendorId ? Number(query.vendorId) : undefined,
        stationId: query.stationId ? Number(query.stationId) : undefined,
      },
      skip,
      limit,
    );

    const data = await this.attachNestedData(rows);

    return {
      success: true,
      message: 'Device transactions fetched successfully',
      data,
      pagination: { totalPages: Math.ceil(count / limit), page },
    };
  }

  async getDeviceTransactionsByChargerId(clientId: number, chargerRef: number, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [rows, count] = await this.repo.findAndCountByCharger(chargerRef, clientId, skip, limit);
    const data = await this.attachNestedData(rows);

    return {
      success: true,
      message: 'Device transactions fetched successfully for chargerId: ',
      data,
      pagination: { totalPages: Math.ceil(count / limit), page },
    };
  }

  async getAllDeviceTransactionsByFleet(
    fleetId: number,
    clientId: number,
    filters: { search?: string; chargerId?: string; vendorId?: string; stationId?: string },
    page: number,
    limit: number,
  ) {
    const skip = (page - 1) * limit;
    const [rows, count] = await this.repo.findAndCountByFleet(
      fleetId,
      clientId,
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
      deviceTransactions: rows,
      pagination: { totalPages: Math.ceil(count / limit), page },
    };
  }

  async getAllMeterTransactions(transactionId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [rows, count] = await this.repo.findAndCountMeterTransactions(transactionId, skip, limit);

    return {
      success: true,
      message: 'Meter transactions fetched successfully',
      data: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    };
  }
}
