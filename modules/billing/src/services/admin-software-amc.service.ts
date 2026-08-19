import { Injectable } from '@nestjs/common';
import { AdminSoftwareAmcRepository } from '../repositories/admin-software-amc.repository';

/** Mirrors `controllers/admin/softwareAMCcontroller.js`. */
@Injectable()
export class AdminSoftwareAmcService {
  constructor(private readonly repo: AdminSoftwareAmcRepository) {}

  async getChargersAccordingToStatus(clientId: number, status: string | undefined, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [rows, count] = await this.repo.findChargersWithLatestAmc(clientId, status, skip, limit);

    const chargerIds = rows.map((r: any) => r.id);
    const amcs = await this.repo.findLatestAmcsByChargerIds(chargerIds);
    const latestByCharger = new Map<number, any>();
    for (const amc of amcs) {
      if (!latestByCharger.has(amc.chargerId)) latestByCharger.set(amc.chargerId, amc);
    }

    const data = rows.map((row: any) => ({
      id: row.id,
      clientId: row.clientId,
      chargerId: row.chargerId,
      createdAt: row.createdAt,
      powerType: row.powerType,
      latestAmcEndDate: row.latestAmcEndDate,
      latestAmcStatus: row.latestAmcStatus,
      clientChargerAmcs: latestByCharger.has(row.id) ? [latestByCharger.get(row.id)] : [],
    }));

    return {
      success: true,
      message: 'Chargers fetched successfully',
      data,
      pagination: { totalPages: Math.ceil(count / limit), page, totalRecords: count },
    };
  }

  async getStackData(clientId: number) {
    const [
      totalAcChargers,
      totalDcChargers,
      totalAcOnboardChargers,
      totalAcActiveChargers,
      totalAcExpiredChargers,
      totalDcOnboardChargers,
      totalDcActiveChargers,
      totalDcExpiredChargers,
    ] = await Promise.all([
      this.repo.countChargersByPowerType(clientId, 'AC'),
      this.repo.countChargersByPowerType(clientId, 'DC'),
      this.repo.countOnboardedChargersByPowerType(clientId, 'AC'),
      this.repo.countActiveChargersByPowerType(clientId, 'AC'),
      this.repo.countExpiredChargersByPowerType(clientId, 'AC'),
      this.repo.countOnboardedChargersByPowerType(clientId, 'DC'),
      this.repo.countActiveChargersByPowerType(clientId, 'DC'),
      this.repo.countExpiredChargersByPowerType(clientId, 'DC'),
    ]);

    return {
      success: true,
      message: 'Stack data fetched successfully',
      data: {
        totalAcChargers,
        totalDcChargers,
        totalAcOnboardChargers,
        totalAcActiveChargers,
        totalAcExpiredChargers,
        totalDcOnboardChargers,
        totalDcActiveChargers,
        totalDcExpiredChargers,
      },
    };
  }
}
