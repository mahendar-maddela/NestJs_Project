import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
import { AddExportRoamingChargersDto, RoamingChargerStatusUpdateDto, UpdateRoamingTariffDto, RoamingClientStatusUpdateDto } from '../dto/admin-roaming.dto';

/** Mirrors `controllers/admin/roaming/export/*.js`. */
@Injectable()
export class AdminRoamingExportService {
  constructor(private readonly repo: AdminRoamingRepository) {}

  async getAllExportedRoamingClients(clientId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [rows, count] = await this.repo.findAndCountByExportClient(clientId, skip, limit);

    return {
      success: true,
      message: 'Roaming clients retrieved successfully',
      data: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    };
  }

  async roamingClientStatusUpdate(roamingClientId: number, dto: RoamingClientStatusUpdateDto) {
    const roamingClient = await this.repo.findRoamingClientById(roamingClientId);
    if (!roamingClient) {
      throw new NotFoundException({ message: 'Roaming Client not found' });
    }
    await this.repo.updateRoamingClientStatus(roamingClientId, dto.status);
    return { success: true, message: 'Roaming Client status updated successfully' };
  }

  async getAllExportedChargersByClientId(
    importClientId: number,
    clientId: number,
    query: { search?: string; page?: string; limit?: string; isRoaming?: string },
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
    const isRoaming = query.isRoaming === 'true';

    const existingChargers = await this.repo.findInternalRoamingChargerIds(clientId, importClientId);
    const chargerIds = existingChargers.map((c) => c.chargerId);

    const [rows, count] = await this.repo.findAndCountExportableChargers(clientId, importClientId, chargerIds, isRoaming, query.search, skip, limit);

    return {
      success: true,
      message: 'Chargers fetched successfully',
      data: rows,
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    };
  }

  async addExportRoamingChargers(clientId: number, dto: AddExportRoamingChargersDto) {
    const roaming = await this.repo.findRoamingClientByImportExport(dto.importClientId, clientId);
    if (!roaming) {
      throw new NotFoundException({ success: false, message: 'Roaming client not found' });
    }
    if (roaming.status === 'BLOCKED') {
      throw new BadRequestException({ success: false, message: 'Roaming client is blocked' });
    }

    for (const chargerData of dto.chargers) {
      const { chargerId, roamingPrice, roamingGst } = chargerData;

      const charger = await this.repo.findChargerByIdAndClient(chargerId, clientId);
      if (!charger) {
        throw new NotFoundException({ success: false, message: `Charger ${chargerId} not found` });
      }

      const existingInternalRoaming = await this.repo.findInternalRoaming(clientId, dto.importClientId, chargerId, roaming.id);
      const existingTariff = await this.repo.findRoamingTariff(chargerId, clientId, dto.importClientId);

      if (!existingTariff) {
        let price = roamingPrice;
        let gst = roamingGst;

        if (price == null) {
          const generalTariff = await this.repo.findGeneralTariff(chargerId, clientId);
          if (!generalTariff) {
            throw new NotFoundException({ success: false, message: `General tariff not found for charger ${chargerId}` });
          }
          price = generalTariff.price ?? undefined;
          gst = generalTariff.gst ?? undefined;
        }

        await this.repo.createRoamingTariff({
          chargerId,
          clientId,
          importClientId: dto.importClientId,
          vendorId: charger.vendorId,
          price,
          gst: gst || 18,
        });
      }

      if (existingInternalRoaming) {
        continue;
      }

      await this.repo.createInternalRoaming({
        exportClientId: clientId,
        importClientId: dto.importClientId,
        chargerId,
        roamingId: roaming.id,
      });
    }

    return { success: true, message: 'Internal Roaming added successfully' };
  }

  async roamingChargerStatusUpdate(clientId: number, dto: RoamingChargerStatusUpdateDto) {
    const roamingClient = await this.repo.findRoamingClientByImportExport(dto.importClientId, clientId);
    if (!roamingClient) {
      throw new NotFoundException({ success: false, message: 'Roaming client not found' });
    }

    const roamingCharger = await this.repo.findInternalRoamingByExportImportCharger(clientId, dto.importClientId, dto.chargerId);
    if (!roamingCharger) {
      throw new NotFoundException({ success: false, message: 'Roaming Charger not found' });
    }

    await this.repo.updateInternalRoamingStatus(roamingCharger.id, dto.status);
    return { success: true, message: 'Roaming Charger status updated successfully' };
  }

  async updateClientRoamingTariff(clientId: number, dto: UpdateRoamingTariffDto) {
    const existingTariff = await this.repo.findRoamingTariff(dto.chargerId, clientId, dto.importClientId);
    if (!existingTariff) {
      throw new NotFoundException({ success: false, message: `Tariff not found for charger ${dto.chargerId}` });
    }

    await this.repo.updateRoamingTariff(existingTariff.id, { price: dto.roamingPrice, gst: dto.roamingGst });
    return { success: true, message: 'Tariff updated successfully' };
  }

  async getAllRoamingExportedChargerSessions(importClientId: number, clientId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [rows, count] = await this.repo.findAndCountSessions(clientId, importClientId, skip, limit);

    return {
      success: true,
      message: 'Charger sessions  successfully',
      data: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    };
  }

  async getRoamingEachMonthAnalytics(
    importClientId: number,
    clientId: number,
    query: { month?: string; year?: string; stationId?: string; chargerId?: string; vendorId?: string },
  ) {
    const month = query.month ? Number(query.month) : undefined;
    const year = query.year ? Number(query.year) : undefined;
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    const maxMonth = resolveMaxMonthIndex(month, year, currentMonth, currentYear);

    const filters = {
      chargerClientId: clientId,
      initiatedClientId: importClientId,
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

  async getStacksData(importClientId: number, clientId: number, query: { stationId?: string; chargerId?: string; year?: string }) {
    const year = query.year ? Number(query.year) : new Date().getFullYear();
    const filters = {
      chargerClientId: clientId,
      initiatedClientId: importClientId,
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

  async downloadRoamingExportedChargerSessions(importClientId: number, clientId: number) {
    // Legacy computes a startDate/endDate range from query params but never applies it to the query — preserved as-is.
    const sessions = await this.repo.findAllExportSessionsForDownload(clientId, importClientId);
    return { success: true, message: 'Successfully fetched roaming exported sessions', data: sessions };
  }
}
