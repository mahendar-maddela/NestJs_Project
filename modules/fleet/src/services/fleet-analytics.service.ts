import { Injectable } from '@nestjs/common';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';
import { FleetAnalyticsRepository, FleetAnalyticsFilters } from '../repositories/fleet-analytics.repository';
import { FleetAnalyticsQueryDto } from '../dto/fleet-analytics.dto';
import {
  getMonthRangeIstToUtc,
  getStartOfYearIstToUtc,
  getEndOfYearIstToUtc,
  getIstDateRangeInUtc,
  resolveMaxMonthIndex,
  getTodayDateIstToUtc,
} from '@app/common';

dayjs.extend(utc);
dayjs.extend(timezone);
const TZ = 'Asia/Kolkata';

/** Mirrors `controllers/Fleet/analyticsController.js`. */
@Injectable()
export class FleetAnalyticsService {
  constructor(private readonly repo: FleetAnalyticsRepository) {}

  private buildFilters(fleetId: number, query: FleetAnalyticsQueryDto): FleetAnalyticsFilters {
    return {
      fleetId,
      chargerRef: query.chargerId ? Number(query.chargerId) : undefined,
      vehicleId: query.vehicleId ? Number(query.vehicleId) : undefined,
      driverId: query.driverId ? Number(query.driverId) : undefined,
      vendorId: query.vendorId ? Number(query.vendorId) : undefined,
      stationId: query.stationId ? Number(query.stationId) : undefined,
    };
  }

  async getEachMonthsData(fleetId: number, query: FleetAnalyticsQueryDto) {
    const filters = this.buildFilters(fleetId, query);
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const year = query.year ? Number(query.year) : undefined;
    const month = query.month ? Number(query.month) : undefined;

    const maxMonth = resolveMaxMonthIndex(month, year, currentMonth, currentYear);

    const monthly: { month: number; spendAmount: number; consumption: number; sessionCount: number }[] = [];

    for (let m = 0; m <= maxMonth; m++) {
      const { startDate, endDate } = getMonthRangeIstToUtc(year || currentYear, m + 1);

      const [totalRevenue, totalEnergy, totalCount] = await Promise.all([
        this.repo.sumField(filters, 'price', startDate, endDate),
        this.repo.sumField(filters, 'totalWh', startDate, endDate),
        this.repo.countTx(filters, startDate, endDate),
      ]);

      monthly.push({ month: m + 1, spendAmount: totalRevenue, consumption: totalEnergy / 1000, sessionCount: totalCount });
    }

    return { success: true, message: "Successfully fetched each month's", data: monthly };
  }

  async totalCradsData(fleetId: number, query: FleetAnalyticsQueryDto) {
    const filters = this.buildFilters(fleetId, query);

    let startDate: Date | undefined;
    let endDate: Date | undefined;
    if (query.year) {
      startDate = getStartOfYearIstToUtc(query.year);
      endDate = getEndOfYearIstToUtc(query.year);
    }

    const [totalwithGstSpent, totalGst, totalAmountwithOutGst, totalEnergyWh] = await Promise.all([
      this.repo.sumField(filters, 'price', startDate, endDate),
      this.repo.sumField(filters, 'gst', startDate, endDate),
      this.repo.sumField(filters, 'amount', startDate, endDate),
      this.repo.sumField(filters, 'totalWh', startDate, endDate),
    ]);

    const totalEnergyKwh = totalEnergyWh / 1000;
    const averageCostPerUnit = totalEnergyKwh > 0 ? totalwithGstSpent / totalEnergyKwh : 0;

    return {
      success: true,
      message: 'Crads data fetched successfull',
      data: { totalwithGstSpent, totalAmountwithOutGst, totalGst, totalEnergyKwh, averageCostPerUnit },
    };
  }

  private async weekPerformance(fleetId: number, query: FleetAnalyticsQueryDto, field: 'price' | 'totalWh', divideBy1000: boolean) {
    const filters = this.buildFilters(fleetId, query);
    const results: { day: string; current: number; last: number }[] = [];

    for (let i = 0; i < 7; i++) {
      const currentDay = (dayjs() as any).tz(TZ).subtract(i, 'day');
      const lastWeekDay = currentDay.subtract(7, 'day');
      const dayLabel = currentDay.format('ddd');

      const { startDate: currentStart, endDate: currentEnd } = getIstDateRangeInUtc(currentDay.toDate(), currentDay.toDate());
      const { startDate: lastStart, endDate: lastEnd } = getIstDateRangeInUtc(lastWeekDay.toDate(), lastWeekDay.toDate());

      const [currentVal, lastVal] = await Promise.all([
        this.repo.sumField(filters, field, currentStart, currentEnd, 1),
        this.repo.sumField(filters, field, lastStart, lastEnd, 1),
      ]);

      results.push({ day: dayLabel, current: divideBy1000 ? currentVal / 1000 : currentVal, last: divideBy1000 ? lastVal / 1000 : lastVal });
    }

    return results;
  }

  async consumptionWeekPerformance(fleetId: number, query: FleetAnalyticsQueryDto) {
    const data = await this.weekPerformance(fleetId, query, 'totalWh', true);
    return { success: true, message: 'Weekly consumption (backward from today)', data };
  }

  async amountSpendingWeekPerformance(fleetId: number, query: FleetAnalyticsQueryDto) {
    const data = await this.weekPerformance(fleetId, query, 'price', false);
    return { success: true, message: 'Weekly spending (backward from today)', data };
  }

  async getAllStationsByFleetUsed(fleetId: number) {
    const stations = await this.repo.findDistinctStationsByFleet(fleetId);
    return { success: true, message: 'Stations fetched successfully', data: stations };
  }

  async consumptionCrad(fleetId: number, year?: string) {
    const filters: FleetAnalyticsFilters = { fleetId };
    const today = getTodayDateIstToUtc();

    const currentDate = (dayjs() as any).tz(TZ);
    const selectedYear = year ? parseInt(year, 10) : currentDate.year();
    const currentMonth = currentDate.month() + 1;

    const { startDate: startOfMonth, endDate: endOfMonth } = getMonthRangeIstToUtc(selectedYear, currentMonth);
    // Legacy passes the raw (possibly-undefined) `year` query param here instead of the resolved
    // `selectedYear` — `dayjs.tz("undefined-01-01", ...)` produces an Invalid Date, which always
    // breaks this query when `year` is omitted. Uses `selectedYear` (the evident intent) instead.
    const startOfYear = getStartOfYearIstToUtc(selectedYear);
    const endOfYear = getEndOfYearIstToUtc(selectedYear);

    const [totalEnergyWh, todayEnergyWh, currentMonthEnergyWh, currentYearEnergyWh] = await Promise.all([
      this.repo.sumField(filters, 'totalWh'),
      this.repo.sumField(filters, 'totalWh', today),
      this.repo.sumField(filters, 'totalWh', startOfMonth, endOfMonth),
      this.repo.sumField(filters, 'totalWh', startOfYear, endOfYear),
    ]);

    return {
      message: '',
      data: {
        totalEnergyKWh: totalEnergyWh / 1000,
        todayEnergyKWh: todayEnergyWh / 1000,
        currentYearEnergyKWh: currentYearEnergyWh / 1000,
        currentMonthEnergyKWh: currentMonthEnergyWh / 1000,
      },
    };
  }

  async topConsumptionVehicles(fleetId: number) {
    const rows = await this.repo.findTopConsumptionVehicles(fleetId);

    const vehicles = rows.map((r) => ({
      vehicleId: r.vehicleId,
      totalConsumptionKwh: Number(r.totalConsumptionKwh),
      vehicle: {
        id: r.vehicle_id,
        regNo: r.vehicle_regNo,
        model: r.model_id
          ? {
              id: r.model_id,
              name: r.model_name,
              status: r.model_status,
              brand: r.brand_id ? { id: r.brand_id, name: r.brand_name } : null,
            }
          : null,
      },
    }));

    return { success: true, message: 'Top 10 vehicles by energy consumption', data: vehicles };
  }

  async timeWiseConsumptions(fleetId: number) {
    const dbData = await this.repo.findTimeWiseConsumption(fleetId);
    const TIME_SLOTS = ['12 AM - 6 AM', '6 AM - 12 PM', '12 PM - 6 PM', '6 PM - 12 AM'];

    const data = TIME_SLOTS.map((time) => {
      const row = dbData.find((d) => d.time === time);
      return { time, kwh: row ? Number(row.kwh) : 0 };
    });

    return { success: true, message: 'Time wise consumption fetched successfully', data };
  }
}
