import { Injectable } from '@nestjs/common';
import { getMonthRangeIstToUtc, resolveMaxMonthIndex } from '@app/common';
import { AdminFleetAnalyticsRepository } from '../repositories/admin-fleet-analytics.repository';

interface OverviewQuery {
  month?: string;
  year?: string;
  stationId?: string;
  chargerId?: string;
}

/** Mirrors `controllers/vendors/Fleet/overviewController.js`. */
@Injectable()
export class VendorFleetOverviewService {
  constructor(private readonly repo: AdminFleetAnalyticsRepository) {}

  async cardCounts(fleetId: number, vendorId: number) {
    const [totalVehicles, totalDrivers, totalGroups, totalSessions, totalEnergyConsumed, totalAmountSpent] = await Promise.all([
      this.repo.countVehiclesByFleetOnly(fleetId),
      this.repo.countDriversByFleetOnly(fleetId),
      this.repo.countGroupsByFleetOnly(fleetId),
      this.repo.countByFleetAndVendor(fleetId, vendorId),
      this.repo.sumByFleetAndVendor(fleetId, vendorId, 'totalWh'),
      this.repo.sumByFleetAndVendor(fleetId, vendorId, 'price'),
    ]);

    return {
      success: true,
      message: 'fetched successfull',
      data: { totalVehicles, totalDrivers, totalGroups, totalSessions, totalEnergyConsumed: totalEnergyConsumed / 1000 || 0, totalAmountSpent },
    };
  }

  private resolveMonthRange(query: OverviewQuery) {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const month = query.month ? Number(query.month) : undefined;
    const year = query.year ? Number(query.year) : undefined;

    const monthdata = resolveMaxMonthIndex(month, year, currentMonth, currentYear);
    const selectedYear = year ?? currentYear;
    return { selectedYear, monthdata };
  }

  async getEachMonthRevenueByFleetId(fleetId: number, vendorId: number, query: OverviewQuery) {
    const { selectedYear, monthdata } = this.resolveMonthRange(query);
    const stationId = query.stationId ? Number(query.stationId) : undefined;
    const chargerRef = query.chargerId ? Number(query.chargerId) : undefined;

    const monthlyRevenues: { month: number; revenue: number }[] = [];
    for (let m = 0; m <= monthdata; m++) {
      const { startDate, endDate } = getMonthRangeIstToUtc(selectedYear, m + 1);
      const totalRevenue = await this.repo.sumByFleetVendorAndMonth(fleetId, vendorId, stationId, chargerRef, 'price', startDate, endDate);
      monthlyRevenues.push({ month: m + 1, revenue: totalRevenue || 0 });
    }

    return { success: true, message: "Successfully fetched each month's revenue", data: monthlyRevenues };
  }

  async getEachMonthConsumptionByFleetId(fleetId: number, vendorId: number, query: OverviewQuery) {
    const { selectedYear, monthdata } = this.resolveMonthRange(query);
    const stationId = query.stationId ? Number(query.stationId) : undefined;
    const chargerRef = query.chargerId ? Number(query.chargerId) : undefined;

    const monthlyConsumptions: { month: number; energy: number }[] = [];
    for (let m = 0; m <= monthdata; m++) {
      const { startDate, endDate } = getMonthRangeIstToUtc(selectedYear, m + 1);
      const totalEnergy = await this.repo.sumByFleetVendorAndMonth(fleetId, vendorId, stationId, chargerRef, 'totalWh', startDate, endDate);
      monthlyConsumptions.push({ month: m + 1, energy: totalEnergy / 1000 || 0 });
    }

    return { success: true, message: "Successfully fetched each month energy's", data: monthlyConsumptions };
  }
}
