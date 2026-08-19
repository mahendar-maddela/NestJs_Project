import { Injectable } from '@nestjs/common';
import { AdminAnalyticsChargerRepository, ChargerAnalyticsFilters } from '../repositories/admin-analytics-charger.repository';
import { SuperAdminAnalyticsChargerFilterDto } from '../dto/super-admin-analytics-charger.dto';
import { getTodayDateIstToUtc, getIstDateRangeInUtc } from '@app/common';

/** Mirrors `controllers/suparAdmin/AnalyticsChargerController.js`. Cross-client: every filter (including clientId) is optional. */
@Injectable()
export class SuperAdminAnalyticsChargerService {
  constructor(private readonly repo: AdminAnalyticsChargerRepository) {}

  private buildFilters(query: SuperAdminAnalyticsChargerFilterDto): ChargerAnalyticsFilters {
    return {
      clientId: query.clientId ? Number(query.clientId) : undefined,
      chargerRef: query.chargerId ? Number(query.chargerId) : undefined,
      vendorId: query.vendorId ? Number(query.vendorId) : undefined,
      stationId: query.stationId ? Number(query.stationId) : undefined,
    };
  }

  async powerConsumption(query: SuperAdminAnalyticsChargerFilterDto) {
    const filters = this.buildFilters(query);
    const today = getTodayDateIstToUtc();

    const [totalConsumption, todayConsumption, totalSessions, todaySessions] = await Promise.all([
      this.repo.sumTotalWh(filters),
      // Legacy drops clientId/vendorId/stationId scoping here (a cross-tenant leak) — fixed to use the same filters as the total.
      this.repo.sumTotalWh(filters, today),
      this.repo.countTransactions(filters),
      this.repo.countTransactions(filters, today),
    ]);

    return {
      success: true,
      message: 'Successfully fetched Power consumption sessions',
      data: {
        totalConsumption: (totalConsumption / 1000).toFixed(2),
        todayConsumption: (todayConsumption / 1000).toFixed(2),
        totalSessions,
        todaySessions,
      },
    };
  }

  async getChargerAnalytics(query: SuperAdminAnalyticsChargerFilterDto) {
    const filters = this.buildFilters(query);

    const [minCurrentOffered, maxCurrentOffered, minVoltage, maxVoltage, maxTemperature] = await Promise.all([
      this.repo.minField(filters, 'currentOffered'),
      this.repo.maxField(filters, 'currentOffered'),
      this.repo.minField(filters, 'voltage'),
      this.repo.maxField(filters, 'voltage'),
      this.repo.maxField(filters, 'temperature'),
    ]);

    return {
      success: true,
      message: 'Successfully fetched device analytics data',
      data: { minCurrentOffered, maxCurrentOffered, minVoltage, maxVoltage, maxTemperature },
    };
  }

  async getEnergyConsumptionOfPastWeek(query: SuperAdminAnalyticsChargerFilterDto) {
    const filters = this.buildFilters(query);
    const dayWise = await this.forPastWeek(async (startDate) => {
      const { startDate: rangeStart, endDate: rangeEnd } = getIstDateRangeInUtc(startDate, startDate);
      const consumption = await this.repo.sumTotalWhBetween(filters, rangeStart, rangeEnd);
      return {
        date: rangeStart.toLocaleDateString('en-US', { weekday: 'short' }),
        consumption: Number((consumption / 1000).toFixed(2)),
      };
    });

    return { success: true, message: 'Successfully fetched day-wise consumption', data: dayWise };
  }

  async getSessionsOfPastWeekReport(query: SuperAdminAnalyticsChargerFilterDto) {
    const filters = this.buildFilters(query);
    const dayWise = await this.forPastWeek(async (startDate) => {
      const { startDate: rangeStart, endDate: rangeEnd } = getIstDateRangeInUtc(startDate, startDate);
      const transactions = await this.repo.countTransactionsBetween(filters, rangeStart, rangeEnd);
      return {
        date: rangeStart.toLocaleDateString('en-US', { weekday: 'short' }),
        transactions,
      };
    });

    return { success: true, message: 'Successfully fetched day-wise transactions', data: dayWise };
  }

  private async forPastWeek<T>(compute: (date: Date) => Promise<T>): Promise<T[]> {
    const todayIst = new Date();
    todayIst.setHours(0, 0, 0, 0);

    const currentDate = new Date(todayIst);
    const results: T[] = [];

    for (let i = 0; i < 8; i++) {
      results.push(await compute(new Date(currentDate)));
      currentDate.setDate(currentDate.getDate() - 1);
    }

    return results;
  }
}
