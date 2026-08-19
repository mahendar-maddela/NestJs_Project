import { Injectable } from '@nestjs/common';
import { AdminAnalyticsRevenueRepository, RevenueFilters } from '../repositories/admin-analytics-revenue.repository';
import {
  SuperAdminRevenueFilterQueryDto,
  SuperAdminMonthlyRevenueQueryDto,
  SuperAdminYearlyRevenueQueryDto,
  SuperAdminEachMonthAnalyticsQueryDto,
  SuperAdminDownloadReportsQueryDto,
} from '../dto/super-admin-analytics-revenue.dto';
import {
  getTodayDateIstToUtc,
  getStartOfMonthIstToUtc,
  getEndOfMonthIstToUtc,
  getStartOfYearIstToUtc,
  getEndOfYearIstToUtc,
  getIstDateRangeInUtc,
  istToUtc,
  formatDuration,
  formatToIst,
} from '@app/common';

function toIdArray(val: string | undefined): number[] {
  if (!val) return [];
  return val
    .split(',')
    .map((v) => parseInt(v, 10))
    .filter((n) => !isNaN(n));
}

/** Mirrors `controllers/suparAdmin/analyticsRevenueController.js`. Cross-client: every filter (including clientId) is optional. */
@Injectable()
export class SuperAdminAnalyticsRevenueService {
  constructor(private readonly repo: AdminAnalyticsRevenueRepository) {}

  private buildFilters(query: SuperAdminRevenueFilterQueryDto): RevenueFilters {
    return {
      clientId: query.clientId ? Number(query.clientId) : undefined,
      chargerRef: query.chargerId ? Number(query.chargerId) : undefined,
      vendorId: query.vendorId ? Number(query.vendorId) : undefined,
      stationId: query.stationId ? Number(query.stationId) : undefined,
    };
  }

  async getTodayRevenueReport(query: SuperAdminRevenueFilterQueryDto) {
    const filters = this.buildFilters(query);
    const today = getTodayDateIstToUtc();

    const [todayRevenue, todayTotalTransactions] = await Promise.all([this.repo.sumPrice(filters, today), this.repo.countTransactions(filters, today)]);

    return {
      success: true,
      message: 'Successfully fetched today Revenue and session',
      data: { todayRevenue: todayRevenue.toFixed(2), todayTotalTransactions },
    };
  }

  async getMonthlyRevenueReport(query: SuperAdminMonthlyRevenueQueryDto) {
    const filters = this.buildFilters(query);
    const today = new Date();
    const queryYear = query.year ? Number(query.year) : today.getFullYear();
    const queryMonth = query.month ? Number(query.month) : today.getMonth() + 1;

    const startOfMonth = getStartOfMonthIstToUtc(queryYear, queryMonth);
    const endOfMonth = getEndOfMonthIstToUtc(queryYear, queryMonth);

    const monthRevenue = await this.repo.sumPrice(filters, startOfMonth, endOfMonth);

    return { success: true, message: 'Successfully fetched Monthly Revenue', data: { monthRevenue: monthRevenue.toFixed(2) } };
  }

  async getYearlyRevenueReport(query: SuperAdminYearlyRevenueQueryDto) {
    const filters = this.buildFilters(query);
    const year = query.year ? Number(query.year) : new Date().getFullYear();

    const startOfYear = getStartOfYearIstToUtc(year);
    const endOfYear = getEndOfYearIstToUtc(year);

    const [yearRevenue, yearSessions] = await Promise.all([
      this.repo.sumPrice(filters, startOfYear, endOfYear),
      this.repo.countTransactions(filters, startOfYear, endOfYear),
    ]);

    return {
      success: true,
      message: 'Successfully fetched Yearly Revenue and Sessions',
      data: { yearRevenue: yearRevenue.toFixed(2), yearSessions },
    };
  }

  async getEachMonthAnalyticsReport(query: SuperAdminEachMonthAnalyticsQueryDto) {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const selectedYear = query.year ? parseInt(query.year, 10) : currentYear;

    if (selectedYear > currentYear) {
      return { success: true, data: [] };
    }

    const clientId = query.clientId ? Number(query.clientId) : undefined;
    const vendorId = query.vendorId ? Number(query.vendorId) : undefined;
    const stationId = query.stationId ? Number(query.stationId) : undefined;
    const chargerId = query.chargerId ? Number(query.chargerId) : undefined;
    const fleetId = query.fleetId ? Number(query.fleetId) : undefined;

    const filters: RevenueFilters = { clientId, chargerRef: chargerId, vendorId, stationId };
    const maxMonth = selectedYear === currentYear ? currentMonth : 11;

    const monthlyCombinedData: any[] = [];
    const monthlyRevenues: any[] = [];
    const monthlyConsumptions: any[] = [];
    const monthlyTransactionCounts: any[] = [];

    for (let m = 0; m <= maxMonth; m++) {
      const isCurrentMonth = selectedYear === currentYear && m === currentMonth;

      let monthData: { revenue: number; consumption: number; transactionCount: number } | null = null;

      // The MonthlyAnalytics cache row requires a clientId (NOT NULL column) — legacy's upsert
      // would throw a DB error for the cross-client (no clientId) case, so caching is skipped
      // entirely when clientId isn't provided; the figure is always computed live instead.
      if (!isCurrentMonth && clientId) {
        const cached = await this.repo.findMonthlyAnalytics({ year: selectedYear, month: m, clientId, vendorId, stationId, chargerId, fleetId });
        if (cached) {
          monthData = { revenue: cached.revenue ?? 0, consumption: cached.consumption ?? 0, transactionCount: cached.transactionCount ?? 0 };
        }
      }

      if (!monthData) {
        const startDate = new Date(selectedYear, m, 1, 0, 0, 0, 0);
        const endDate = new Date(selectedYear, m + 1, 0, 23, 59, 59, 999);
        const startOfMonth = istToUtc(startDate);
        const endOfMonth = istToUtc(endDate);

        const [totalRevenue, totalEnergy, totalCount] = await Promise.all([
          this.repo.sumPrice(filters, startOfMonth, endOfMonth),
          this.repo.sumTotalWh(filters, startOfMonth, endOfMonth),
          this.repo.countTransactions(filters, startOfMonth, endOfMonth),
        ]);

        monthData = { revenue: totalRevenue, consumption: totalEnergy / 1000, transactionCount: totalCount };

        if (!isCurrentMonth && clientId) {
          await this.repo.upsertMonthlyAnalytics({
            year: selectedYear,
            month: m,
            vendorId: vendorId ?? null,
            stationId: stationId ?? null,
            chargerId: chargerId ?? null,
            fleetId: fleetId ?? null,
            revenue: monthData.revenue,
            consumption: monthData.consumption,
            transactionCount: monthData.transactionCount,
            clientId,
          });
        }
      }

      monthlyCombinedData.push({ month: m + 1, revenue: monthData.revenue, consumption: monthData.consumption, transactionCount: monthData.transactionCount });
      monthlyConsumptions.push({ month: m + 1, consumption: monthData.consumption });
      monthlyRevenues.push({ month: m + 1, revenue: monthData.revenue });
      monthlyTransactionCounts.push({ month: m + 1, transactionCount: monthData.transactionCount });
    }

    return {
      success: true,
      message: "Successfully fetched each month's revenue",
      data: { monthlyRevenues, monthlyConsumptions, monthlyTransactionCounts, monthlyCobinedata: monthlyCombinedData },
    };
  }

  async downloadSessionReportsByFilters(query: SuperAdminDownloadReportsQueryDto) {
    const clientIds = toIdArray(query.clientIds);
    const vendorIds = toIdArray(query.vendorIds);
    const stationIds = toIdArray(query.stationIds);
    const chargerIds = toIdArray(query.chargerIds);
    const applyGst = query.applyGst === 'true';

    let startDate: Date | undefined;
    let endDate: Date | undefined;
    if (query.startDate && query.endDate) {
      const range = getIstDateRangeInUtc(query.startDate, query.endDate);
      startDate = range.startDate;
      endDate = range.endDate;
    }

    const transactions = await this.repo.findTransactionsForDownloadCrossClient({ clientIds, vendorIds, stationIds, chargerIds, startDate, endDate, applyGst });

    const formatted = transactions.map((t: any) => {
      const fleetManager = t.fleetUser?.fleetUsers?.[0];
      return {
        SessionId: t.transactionId,
        StartDate: formatToIst(t.startDate),
        cpo: t.charger?.vendor?.vendor_name,
        // Legacy reads `station.station_name`, a field that doesn't exist on the Station model
        // (the real column is `name`) — always undefined in legacy's report, preserved as-is.
        Station: undefined,
        Charger: t.charger?.chargerId,
        Connector: t.connectorId,
        DateTime: formatToIst(t.createdAt),
        Units: (t.totalWh ?? 0) / 1000,
        Amount: t.amount,
        gstAmount: t.gst,
        TotalAmount: t.price,
        UserId: t.user ? t.user.userId : t.fleetUser?.fleetUId,
        Name: t.user ? t.user.first_name : t.fleetUser?.cName,
        Phone: t.user ? t.user.phone : fleetManager?.phone,
        Gst: t.user ? t.user.gst : t.fleetUser?.gst,
        StartFrom: t.platform,
        StopFrom: t.stopFrom,
        StartSoc: t.startSoc,
        StopSoc: t.stopSoc,
        TariffName: t.tariffName,
        RfidTag: t.rfidTag,
        Reason: t.reason,
        Status: t.status === 1 ? 'Completed' : 'Charging',
        StartMeterValue: t.startMeterValue,
        StopMeterValue: t.stopMeterValue,
        CharginDuration: formatDuration(t.charginDuration),
      };
    });

    return { success: true, message: 'Report generated successfully', count: formatted.length, data: formatted };
  }
}
