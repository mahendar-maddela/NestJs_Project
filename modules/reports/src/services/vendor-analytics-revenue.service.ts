import { Injectable } from '@nestjs/common';
import type { Dayjs } from 'dayjs';
import type {} from 'dayjs/plugin/utc';
import type {} from 'dayjs/plugin/timezone';
import { AdminAnalyticsRevenueRepository, RevenueFilters } from '../repositories/admin-analytics-revenue.repository';
import { VendorAnalyticsRevenueRepository } from '../repositories/vendor-analytics-revenue.repository';
import {
  getTodayDateIstToUtc,
  getTodayEndDateIstToUtc,
  getStartOfMonthIstToUtc,
  getEndOfMonthIstToUtc,
  getStartOfYearIstToUtc,
  getEndOfYearIstToUtc,
  getIstDateRangeInUtc,
  getMonthRangeIstToUtc,
  getYesterdayRangeIstToUtc,
  resolveMaxMonthIndex,
} from '@app/common';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const dayjs: typeof import('dayjs') = require('dayjs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
dayjs.extend(require('dayjs/plugin/utc'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
dayjs.extend(require('dayjs/plugin/timezone'));
const TZ = 'Asia/Kolkata';

interface RevenueQuery {
  stationId?: string;
  chargerId?: string;
  year?: string;
}

/** Mirrors `controllers/vendors/AnalyticsRevenueController.js`. */
@Injectable()
export class VendorAnalyticsRevenueService {
  constructor(
    private readonly repo: AdminAnalyticsRevenueRepository,
    private readonly vendorRepo: VendorAnalyticsRevenueRepository,
  ) {}

  private buildFilters(clientId: number, vendorId: number, query: RevenueQuery): RevenueFilters {
    return {
      clientId,
      vendorId,
      stationId: query.stationId ? Number(query.stationId) : undefined,
      chargerRef: query.chargerId ? Number(query.chargerId) : undefined,
    };
  }

  async getTodayRevenue(chargerId: string, vendorId: number) {
    const today = getTodayDateIstToUtc();
    const totalRevenue = await this.vendorRepo.sumPriceByChargerIdString(chargerId, vendorId, today);
    return { success: true, message: 'Successfully fetched today Revenue', totalRevenue: totalRevenue.toFixed(2) };
  }

  async getMonthlyRevenue(chargerId: string, vendorId: number, month: string | undefined, year: string | undefined) {
    const startOfMonth = getStartOfMonthIstToUtc(year || new Date().getFullYear(), month as string);
    const endOfMonth = getEndOfMonthIstToUtc(year || new Date().getFullYear(), month as string);
    const totalRevenue = await this.vendorRepo.sumPriceByChargerIdString(chargerId, vendorId, startOfMonth, endOfMonth);
    return { success: true, message: 'Successfully fetched Monthly Revenue', totalRevenue: totalRevenue.toFixed(2) };
  }

  async getYearlyRevenue(clientId: number, vendorId: number, query: RevenueQuery & { isUnits?: string | boolean }) {
    const filters = this.buildFilters(clientId, vendorId, query);
    const startOfYear = getStartOfYearIstToUtc(query.year as string);
    const endOfYear = getEndOfYearIstToUtc(query.year as string);

    if (query.isUnits === 'true' || query.isUnits === true) {
      const totalConsumption = await this.repo.sumTotalWh(filters, startOfYear, endOfYear);
      return { success: true, message: 'Successfully fetched Yearly Consumption', totalRevenue: (totalConsumption / 1000).toFixed(2) };
    }

    const totalRevenue = await this.repo.sumPrice(filters, startOfYear, endOfYear);
    return { success: true, message: 'Successfully fetched Yearly Revenue', totalRevenue: totalRevenue.toFixed(2) };
  }

  async getEachMonthRevenue(clientId: number, vendorId: number, query: RevenueQuery & { month?: string }) {
    const filters = this.buildFilters(clientId, vendorId, query);
    const { selectedYear, monthdata } = this.resolveMonthRange(query);

    const monthlyRevenues: { month: number; revenue: number }[] = [];
    for (let m = 0; m <= monthdata; m++) {
      const { startDate, endDate } = getMonthRangeIstToUtc(selectedYear, m + 1);
      const totalRevenue = await this.repo.sumPrice(filters, startDate, endDate);
      monthlyRevenues.push({ month: m + 1, revenue: totalRevenue || 0 });
    }

    return { success: true, message: "Successfully fetched each month's revenue", data: monthlyRevenues };
  }

  async getEachMonthConsumption(clientId: number, vendorId: number, query: RevenueQuery & { month?: string }) {
    const filters = this.buildFilters(clientId, vendorId, query);
    const { selectedYear, monthdata } = this.resolveMonthRange(query);

    const monthlyConsumptions: { month: number; energy: number }[] = [];
    for (let m = 0; m <= monthdata; m++) {
      const { startDate, endDate } = getMonthRangeIstToUtc(selectedYear, m + 1);
      const totalEnergy = await this.repo.sumTotalWh(filters, startDate, endDate);
      monthlyConsumptions.push({ month: m + 1, energy: totalEnergy / 1000 || 0 });
    }

    return { success: true, message: "Successfully fetched each month energy's", data: monthlyConsumptions };
  }

  async getEachMonthTransactionCount(clientId: number, vendorId: number, query: RevenueQuery & { month?: string }) {
    const filters = this.buildFilters(clientId, vendorId, query);
    const { selectedYear, monthdata } = this.resolveMonthRange(query);

    const monthlyTransactionCounts: { month: number; count: number }[] = [];
    for (let m = 0; m <= monthdata; m++) {
      const { startDate, endDate } = getMonthRangeIstToUtc(selectedYear, m + 1);
      const totalCount = await this.repo.countTransactions(filters, startDate, endDate);
      monthlyTransactionCounts.push({ month: m + 1, count: totalCount || 0 });
    }

    return { success: true, message: "Successfully fetched each month energy's", data: monthlyTransactionCounts };
  }

  private resolveMonthRange(query: { month?: string; year?: string }) {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const month = query.month ? Number(query.month) : undefined;
    const year = query.year ? Number(query.year) : undefined;

    const monthdata = resolveMaxMonthIndex(month, year, currentMonth, currentYear);
    const selectedYear = year ?? currentYear;
    return { selectedYear, monthdata };
  }

  async getAllStationWithStation(vendorId: number) {
    const stations = await this.vendorRepo.findStationsWithChargersForVendor(vendorId);
    return { success: true, message: 'Stations retrieved successfully', data: stations };
  }

  async analyticsRevenueCard(clientId: number, vendorId: number, query: RevenueQuery) {
    const filters = this.buildFilters(clientId, vendorId, query);
    const year = query.year || String(new Date().getFullYear());

    const sumRevenue = (from: Date, to: Date) => this.repo.sumPrice(filters, from, to, 1);
    const countSessions = (from: Date, to: Date) => this.repo.countTransactions(filters, from, to, 1);

    const todayStart = getTodayDateIstToUtc();
    const todayEnd = getTodayEndDateIstToUtc();
    const { startDate: yesterdayStart, endDate: yesterdayEnd } = getYesterdayRangeIstToUtc();

    const thisWeekStartIst = this.getStartOfWeekIst();
    const thisWeekEndIst = this.getEndOfWeekIst(thisWeekStartIst);
    const lastWeekStartIst = new Date(thisWeekStartIst);
    lastWeekStartIst.setDate(lastWeekStartIst.getDate() - 7);
    const lastWeekEndIst = this.getEndOfWeekIst(lastWeekStartIst);

    const { startDate: thisWeekStart, endDate: thisWeekEnd } = getIstDateRangeInUtc(thisWeekStartIst, thisWeekEndIst);
    const { startDate: lastWeekStart, endDate: lastWeekEnd } = getIstDateRangeInUtc(lastWeekStartIst, lastWeekEndIst);

    const currentDate = new Date();
    const thisMonthStart = getStartOfMonthIstToUtc(Number(year) || currentDate.getFullYear(), currentDate.getMonth() + 1);
    const lastMonth = new Date(currentDate);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthStart = getStartOfMonthIstToUtc(lastMonth.getFullYear(), lastMonth.getMonth() + 1);
    const lastMonthEnd = getEndOfMonthIstToUtc(lastMonth.getFullYear(), lastMonth.getMonth() + 1);

    const yearStart = getStartOfYearIstToUtc(year);
    const yearEnd = getEndOfYearIstToUtc(year);

    const [todayRevenue, yesterdayRevenue, thisWeekRevenue, lastWeekRevenue, thisMonthRevenue, lastMonthRevenue, yearlyRevenue, todaySessions] =
      await Promise.all([
        sumRevenue(todayStart, todayEnd),
        sumRevenue(yesterdayStart, yesterdayEnd),
        sumRevenue(thisWeekStart, thisWeekEnd),
        sumRevenue(lastWeekStart, lastWeekEnd),
        sumRevenue(thisMonthStart, todayEnd),
        sumRevenue(lastMonthStart, lastMonthEnd),
        sumRevenue(yearStart, yearEnd),
        countSessions(todayStart, todayEnd),
      ]);

    return {
      success: true,
      message: 'crad  data fetched successfull',
      data: { todaySessions, todayRevenue, yesterdayRevenue, thisWeekRevenue, lastWeekRevenue, thisMonthRevenue, lastMonthRevenue, yearlyRevenue, year },
    };
  }

  async analyticsConsumptionCard(clientId: number, vendorId: number, query: RevenueQuery) {
    const filters = this.buildFilters(clientId, vendorId, query);
    const year = query.year || String(new Date().getFullYear());

    const sumConsumption = (from: Date, to: Date) => this.repo.sumTotalWh(filters, from, to, 1);
    const countSessions = (from: Date, to: Date) => this.repo.countTransactions(filters, from, to, 1);

    const todayStart = getTodayDateIstToUtc();
    const todayEnd = getTodayEndDateIstToUtc();
    const { startDate: yesterdayStart, endDate: yesterdayEnd } = getYesterdayRangeIstToUtc();

    const thisWeekStartIst = this.getStartOfWeekIst();
    const thisWeekEndIst = this.getEndOfWeekIst(thisWeekStartIst);
    const lastWeekStartIst = new Date(thisWeekStartIst);
    lastWeekStartIst.setDate(lastWeekStartIst.getDate() - 7);
    const lastWeekEndIst = this.getEndOfWeekIst(lastWeekStartIst);

    const { startDate: thisWeekStart, endDate: thisWeekEnd } = getIstDateRangeInUtc(thisWeekStartIst, thisWeekEndIst);
    const { startDate: lastWeekStart, endDate: lastWeekEnd } = getIstDateRangeInUtc(lastWeekStartIst, lastWeekEndIst);

    const thisMonthStart = getStartOfMonthIstToUtc(year, new Date().getMonth() + 1);
    const lastMonthDate = new Date();
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    const lastMonthStart = getStartOfMonthIstToUtc(lastMonthDate.getFullYear(), lastMonthDate.getMonth() + 1);
    const lastMonthEnd = getEndOfMonthIstToUtc(lastMonthDate.getFullYear(), lastMonthDate.getMonth() + 1);

    const yearStart = getStartOfYearIstToUtc(year);
    const yearEnd = getEndOfYearIstToUtc(year);

    const [
      todayConsumption,
      yesterdayConsumption,
      thisWeekConsumption,
      lastWeekConsumption,
      thisMonthConsumption,
      lastMonthConsumption,
      yearlyConsumption,
      todaySessions,
    ] = await Promise.all([
      sumConsumption(todayStart, todayEnd),
      sumConsumption(yesterdayStart, yesterdayEnd),
      sumConsumption(thisWeekStart, thisWeekEnd),
      sumConsumption(lastWeekStart, lastWeekEnd),
      sumConsumption(thisMonthStart, todayEnd),
      sumConsumption(lastMonthStart, lastMonthEnd),
      sumConsumption(yearStart, yearEnd),
      countSessions(todayStart, todayEnd),
    ]);

    return {
      success: true,
      message: 'crad  data fetched successfull',
      data: {
        todaySessions,
        todayConsumption: todayConsumption / 1000 || 0,
        yesterdayConsumption: yesterdayConsumption / 1000 || 0,
        thisWeekConsumption: thisWeekConsumption / 1000 || 0,
        lastWeekConsumption: lastWeekConsumption / 1000 || 0,
        thisMonthConsumption: thisMonthConsumption / 1000 || 0,
        lastMonthConsumption: lastMonthConsumption / 1000 || 0,
        yearlyConsumption: yearlyConsumption / 1000 || 0,
        year,
      },
    };
  }

  async last7DaysPerformance(clientId: number, vendorId: number, query: RevenueQuery) {
    const filters = this.buildFilters(clientId, vendorId, query);
    const results: { date: string; revenue: number; consumption: number; sessions: number }[] = [];

    for (let i = 0; i < 9; i++) {
      const day = (dayjs() as Dayjs).tz(TZ).subtract(i, 'day');
      const startUTC = day.startOf('day').utc().toDate();
      const endUTC = day.endOf('day').utc().toDate();
      const label = day.format('DD MMM');

      const [revenue, sessions, consumption] = await Promise.all([
        this.repo.sumPrice(filters, startUTC, endUTC, 1),
        this.repo.countTransactions(filters, startUTC, endUTC, 1),
        this.repo.sumTotalWh(filters, startUTC, endUTC, 1),
      ]);

      results.push({ date: label, revenue: Number(revenue || 0), consumption: Number((consumption || 0) / 1000), sessions: sessions || 0 });
    }

    return { success: true, message: 'Last 9 days data', data: results.reverse() };
  }

  async getEachMonthAnalytics(clientId: number, vendorId: number, query: RevenueQuery & { month?: string; fleetId?: string }) {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const selectedYear = query.year ? parseInt(query.year, 10) : currentYear;

    if (selectedYear > currentYear) {
      return { success: true, data: [] };
    }

    const stationId = query.stationId ? Number(query.stationId) : undefined;
    const chargerId = query.chargerId ? Number(query.chargerId) : undefined;
    const fleetId = query.fleetId ? Number(query.fleetId) : undefined;
    const filters: RevenueFilters = { clientId, vendorId, stationId, chargerRef: chargerId };

    const maxMonth = selectedYear === currentYear ? currentMonth : 11;

    const monthlyCombinedData: { month: number; revenue: number; consumption: number; transactionCount: number }[] = [];
    const monthlyRevenues: { month: number; revenue: number }[] = [];
    const monthlyConsumptions: { month: number; consumption: number }[] = [];
    const monthlyTransactionCounts: { month: number; transactionCount: number }[] = [];

    for (let m = 0; m <= maxMonth; m++) {
      const isCurrentMonth = selectedYear === currentYear && m === currentMonth;

      let monthData: { revenue: number; consumption: number; transactionCount: number } | null = null;

      if (!isCurrentMonth) {
        const cached = await this.repo.findMonthlyAnalytics({ year: selectedYear, month: m, clientId, vendorId, stationId, chargerId, fleetId });
        if (cached) {
          monthData = { revenue: cached.revenue ?? 0, consumption: cached.consumption ?? 0, transactionCount: cached.transactionCount ?? 0 };
        }
      }

      if (!monthData) {
        const { startDate: startOfMonth, endDate: endOfMonth } = getMonthRangeIstToUtc(selectedYear, m + 1);

        const [totalRevenue, totalEnergy, totalCount] = await Promise.all([
          this.repo.sumPrice(filters, startOfMonth, endOfMonth),
          this.repo.sumTotalWh(filters, startOfMonth, endOfMonth),
          this.repo.countTransactions(filters, startOfMonth, endOfMonth),
        ]);

        monthData = { revenue: totalRevenue, consumption: totalEnergy / 1000, transactionCount: totalCount };

        if (!isCurrentMonth) {
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
          } as any);
        }
      }

      monthlyCombinedData.push({ month: m + 1, revenue: monthData.revenue, consumption: monthData.consumption, transactionCount: monthData.transactionCount });
      monthlyConsumptions.push({ month: m + 1, consumption: monthData.consumption });
      monthlyRevenues.push({ month: m + 1, revenue: monthData.revenue });
      monthlyTransactionCounts.push({ month: m + 1, transactionCount: monthData.transactionCount });
    }

    return {
      success: true,
      message: "Successfully fetched each month's revenue for vendor",
      data: { monthlyRevenues, monthlyConsumptions, monthlyTransactionCounts, monthlyCobinedata: monthlyCombinedData },
    };
  }

  private getStartOfWeekIst(date: Date = new Date()): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private getEndOfWeekIst(start: Date): Date {
    const d = new Date(start);
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
  }
}
