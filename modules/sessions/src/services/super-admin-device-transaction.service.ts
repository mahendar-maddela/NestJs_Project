import { Injectable } from '@nestjs/common';
import { AdminDeviceTransactionRepository } from '../../../sessions/src/repositories/admin-device-transaction.repository';
import { SuperAdminDeviceTransactionQueryDto } from '../../../sessions/src/dto/super-admin-device-transaction.dto';

/** Mirrors `controllers/suparAdmin/deviceTransactionController.js`. */
@Injectable()
export class SuperAdminDeviceTransactionService {
  constructor(private readonly repo: AdminDeviceTransactionRepository) { }

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
        fleetUser: row.fleetUser ? { ...row.fleetUser, fleetUsers: manager ? [manager] : [] } : row.fleetUser,
      };
    });
  }

  async getAllClientDeviceTransactions(query: SuperAdminDeviceTransactionQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 200;
    const skip = (page - 1) * limit;

    const [rows, count] = await this.repo.findAndCountAllTransactionsCrossClient(
      {
        search: query.search,
        chargerRef: query.chargerId ? Number(query.chargerId) : undefined,
        vendorId: query.vendorId ? Number(query.vendorId) : undefined,
        stationId: query.stationId ? Number(query.stationId) : undefined,
        clientId: query.clientId ? Number(query.clientId) : undefined,
        status: query.status !== undefined ? Number(query.status) : undefined,
      },
      skip,
      limit,
    );

    const data = await this.attachNestedData(rows);

    return {
      success: true,
      message: 'Device transactions fetched successfully',
      data,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    };
  }

  async getTransactionsByCharger(chargerId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [rows, count] = await this.repo.findAndCountByChargerCrossClient(chargerId, skip, limit);
    const data = await this.attachNestedData(rows);

    return {
      success: true,
      message: `Transactions fetched successfully for chargerId: ${chargerId}`,
      data,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    };
  }
}
