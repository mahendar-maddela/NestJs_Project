import { Injectable } from '@nestjs/common';
import { FleetDashboardRepository } from '../repositories/fleet-dashboard.repository';

/** Mirrors `controllers/Fleet/DashboardController.js`. */
@Injectable()
export class FleetDashboardService {
  constructor(private readonly repo: FleetDashboardRepository) {}

  async getCardCounts(fleetId: number, clientId: number) {
    const [vehicleCount, driverCount, wallet, specailPriceChargersCount] = await Promise.all([
      this.repo.countVehiclesByFleet(fleetId),
      this.repo.countDriversByFleetClient(fleetId, clientId),
      this.repo.findFleetWallet(fleetId),
      this.repo.countSpecialPriceChargersByFleet(fleetId),
    ]);

    return {
      success: true,
      data: {
        vehicleCount,
        driverCount,
        walletBalance: wallet ? wallet.balance : 0,
        specailPriceChargersCount,
      },
    };
  }

  async getRecentWalletTransactions(fleetId: number, page: number, limit: number) {
    const wallet = await this.repo.findFleetWallet(fleetId);
    const skip = (page - 1) * limit;
    // Legacy hardcodes the DB fetch to 5 rows regardless of the `limit` query param,
    // but still uses the query-provided `limit` for the pagination math — preserved as-is.
    const [rows, count] = await this.repo.findAndCountWalletTransactions(wallet!.id, skip);

    return {
      success: true,
      message: 'Wallet transactions fetched successfully',
      data: rows,
      pagination: { totalItems: count, totalPages: Math.ceil(count / limit), currentPage: page },
    };
  }

  async getDashboardVehicles(fleetId: number, clientId: number) {
    const now = new Date();
    const today = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const currentTime = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false });

    const assignments = await this.repo.findActiveDashboardAssignments(fleetId, clientId, today, currentTime);

    const response = assignments.map((item) => ({
      vinNumber: item.vehicle?.vinNumber || '-',
      autoCharge: item.vehicle?.autoCharge || false,
      driverName: item.fleetDriver?.name || 'N/A',
      assignedAt: item.createdAt,
      driverVehicleId: item.id,
      vehicleId: item.vehicle.id,
      regNo: item.vehicle.regNo,
    }));

    return { success: true, count: response.length, data: response };
  }
}
