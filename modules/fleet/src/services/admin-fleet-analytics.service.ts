import { Injectable, NotFoundException } from '@nestjs/common';
import { getMonthRangeIstToUtc, resolveMaxMonthIndex } from '@app/common';
import { AdminFleetAnalyticsRepository } from '../repositories/admin-fleet-analytics.repository';

/** Mirrors `controllers/admin/fleet/analyticController.js`. */
@Injectable()
export class AdminFleetAnalyticsService {
  constructor(private readonly repo: AdminFleetAnalyticsRepository) {}

  async getAnalyticsEachMonthByFleetId(fleetId: number, clientId: number, monthQuery?: string, yearQuery?: string) {
    const fleet = await this.repo.findFleetByIdAndClient(fleetId, clientId);
    if (!fleet) {
      throw new NotFoundException({ success: false, message: 'Fleet not found' });
    }

    const month = monthQuery ? Number(monthQuery) : undefined;
    const year = yearQuery ? Number(yearQuery) : undefined;

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    const maxMonth = resolveMaxMonthIndex(month, year, currentMonth, currentYear);

    const eachMonthRevenue: { month: number; revenue: number }[] = [];
    const eachMonthConsumption: { month: number; energy: number }[] = [];
    const echMonthSessionCount: { month: number; count: number }[] = [];

    for (let m = 0; m <= maxMonth; m++) {
      const { startDate, endDate } = getMonthRangeIstToUtc(year || currentYear, m + 1);

      const [revenue, energy, count] = await Promise.all([
        this.repo.sumByFleetAndMonth(fleetId, 'price', startDate, endDate),
        this.repo.sumByFleetAndMonth(fleetId, 'totalWh', startDate, endDate),
        this.repo.countByFleetAndMonth(fleetId, startDate, endDate),
      ]);

      eachMonthRevenue.push({ month: m + 1, revenue });
      eachMonthConsumption.push({ month: m + 1, energy: energy / 1000 });
      echMonthSessionCount.push({ month: m + 1, count });
    }

    return { success: true, message: 'Analytics successfully fetched', eachMonthRevenue, eachMonthConsumption, echMonthSessionCount };
  }

  async getAllFleetUsersDetailsCount(fleetId: number, clientId: number) {
    const fleet = await this.repo.findFleetByIdAndClient(fleetId, clientId);
    if (!fleet) {
      // Legacy's exact (typo'd) response shape for this specific not-found case.
      return { successs: false, message: 'Fleet not found' };
    }

    const [driverCount, vehicleCount, totalEnergy, totalRevenue] = await Promise.all([
      this.repo.countDriversByFleet(fleetId, clientId),
      this.repo.countVehiclesByFleet(fleetId, clientId),
      this.repo.sumTotalByFleet(fleetId, 'totalWh'),
      this.repo.sumTotalByFleet(fleetId, 'price'),
    ]);

    return {
      successs: true,
      messgae: 'Counts successfully fetched',
      driverCount,
      vehicleCount,
      totalRevenue,
      totalConseption: totalEnergy ? totalEnergy / 1000 : 0,
    };
  }
}
