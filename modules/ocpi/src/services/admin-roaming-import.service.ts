import { Injectable } from '@nestjs/common';
import {
  resolveMaxMonthIndex,
  getMonthRangeIstToUtc,
  getTodayDateIstToUtc,
  getTodayEndDateIstToUtc,
  getStartOfMonthIstToUtc,
  getStartOfYearIstToUtc,
  getEndOfYearIstToUtc,
} from '@app/common';
import { AdminRoamingRepository } from '../repositories/admin-roaming.repository';

/** Mirrors `controllers/admin/roaming/import/importRoaming.controller.js` + `import/session.controller.js`. */
@Injectable()
export class AdminRoamingImportService {
  constructor(private readonly repo: AdminRoamingRepository) {}

  async getAllImportedRoamingClients(clientId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [rows, count] = await this.repo.findAndCountByImportClient(clientId, skip, limit);

    return {
      success: true,
      message: 'Roaming clients retrieved successfully',
      data: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    };
  }

  async getAllImportedRoamingChargers(exportClientId: number, clientId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [rows, count] = await this.repo.findAndCountImportedChargers(exportClientId, clientId, skip, limit);

    return {
      success: true,
      message: 'Chargers retrieved successfully',
      data: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    };
  }

  async getAllRoamingChargerSessions(exportClientId: number, clientId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [rows, count] = await this.repo.findAndCountSessions(exportClientId, clientId, skip, limit);

    return {
      success: true,
      message: 'Charger sessions retrieved successfully',
      data: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    };
  }

  async getRoamEachMonthAnalytics(
    exportClientId: number,
    clientId: number,
    query: { month?: string; year?: string; stationId?: string; chargerId?: string; vendorId?: string },
  ) {
    const month = query.month ? Number(query.month) : undefined;
    const year = query.year ? Number(query.year) : undefined;
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    const maxMonth = resolveMaxMonthIndex(month, year, currentMonth, currentYear);

    // Import side: the charger belongs to the export client; the current (importing) client initiated the session.
    const filters = {
      chargerClientId: exportClientId,
      initiatedClientId: clientId,
      chargerRef: query.chargerId ? Number(query.chargerId) : undefined,
      vendorId: query.vendorId ? Number(query.vendorId) : undefined,
      stationId: query.stationId ? Number(query.stationId) : undefined,
    };

    const monthlyRevenues: any[] = [];
    const monthlyConsumptions: any[] = [];
    const monthlyTransactionCounts: any[] = [];
    const monthlyCobinedata: any[] = [];

    for (let m = 0; m <= maxMonth; m++) {
      const { startDate, endDate } = getMonthRangeIstToUtc(year || currentYear, m + 1);

      const [revenue, energy, count] = await Promise.all([
        this.repo.sumRoamingField(filters, 'price', startDate, endDate),
        this.repo.sumRoamingField(filters, 'totalWh', startDate, endDate),
        this.repo.countRoamingTx(filters, startDate, endDate),
      ]);

      monthlyRevenues.push({ month: m + 1, revenue });
      monthlyConsumptions.push({ month: m + 1, consumption: energy / 1000 });
      monthlyTransactionCounts.push({ month: m + 1, transactionCount: count });
      monthlyCobinedata.push({ month: m + 1, transactionCount: count, consumption: energy / 1000, revenue });
    }

    return {
      success: true,
      message: "Successfully fetched each month's revenue",
      data: { monthlyRevenues, monthlyConsumptions, monthlyTransactionCounts, monthlyCobinedata },
    };
  }

  async getStacksData(exportClientId: number, clientId: number, query: { stationId?: string; chargerId?: string; year?: string }) {
    const year = query.year ? Number(query.year) : new Date().getFullYear();
    const filters = {
      chargerClientId: exportClientId,
      initiatedClientId: clientId,
      chargerRef: query.chargerId ? Number(query.chargerId) : undefined,
      stationId: query.stationId ? Number(query.stationId) : undefined,
    };

    const todayStart = getTodayDateIstToUtc();
    const todayEnd = getTodayEndDateIstToUtc();
    const thisMonthStart = getStartOfMonthIstToUtc(year, new Date().getMonth() + 1);
    const yearStart = getStartOfYearIstToUtc(year);
    const yearEnd = getEndOfYearIstToUtc(year);

    const [
      todayRevenue,
      currentMonthRevenue,
      currentYearRevenue,
      totalRevenue,
      todayConsumption,
      currentMonthConsumption,
      currentYearConsumption,
      todayTransaction,
      currentMonthTransaction,
      currentYearTransaction,
    ] = await Promise.all([
      this.repo.sumRoamingField(filters, 'price', todayStart, todayEnd),
      this.repo.sumRoamingField(filters, 'price', thisMonthStart, todayEnd),
      this.repo.sumRoamingField(filters, 'price', yearStart, yearEnd),
      this.repo.sumRoamingField(filters, 'price', yearStart, yearEnd),
      this.repo.sumRoamingField(filters, 'totalWh', todayStart, todayEnd),
      this.repo.sumRoamingField(filters, 'totalWh', thisMonthStart, todayEnd),
      this.repo.sumRoamingField(filters, 'totalWh', yearStart, yearEnd),
      this.repo.countRoamingTx(filters, todayStart, todayEnd),
      this.repo.countRoamingTx(filters, thisMonthStart, todayEnd),
      this.repo.countRoamingTx(filters, yearStart, yearEnd),
    ]);

    return {
      success: true,
      message: "Successfully fetched each month's revenue",
      data: {
        todayRevenue,
        currentMonthRevenue,
        currentYearRevenue,
        totalRevenue,
        todayConsumption: todayConsumption / 1000,
        currentMonthConsumption: currentMonthConsumption / 1000,
        currentYearConsumption: currentYearConsumption / 1000,
        todayTransaction,
        currentMonthTransaction,
        currentYearTransaction,
      },
    };
  }
}
