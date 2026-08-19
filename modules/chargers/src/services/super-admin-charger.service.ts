import { BadRequestException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { SuperAdminChargerRepository } from '../repositories/super-admin-charger.repository';
import { SuperAdminChargerQueryDto } from '../dto/super-admin-charger.dto';

/** Mirrors `controllers/suparAdmin/chargerController.js`. */
@Injectable()
export class SuperAdminChargerService {
  constructor(private readonly repo: SuperAdminChargerRepository) {}

  async getClientsAllChargers(query: SuperAdminChargerQueryDto) {
    const filters = {
      vendorType: query.vendorType ? Number(query.vendorType) : undefined,
      vendorId: query.vendorId ? Number(query.vendorId) : undefined,
      search: query.search,
      stationId: query.stationId ? Number(query.stationId) : undefined,
      clientId: query.clientId ? Number(query.clientId) : undefined,
      powerType: query.powerType,
      status: query.status,
    };

    if (!query.page && !query.limit) {
      const chargers = await this.repo.findAllSimple(filters);
      const data = chargers.map((c: any) => ({
        id: c.id,
        clientId: c.clientId,
        vendorId: c.vendorId,
        stationId: c.stationId,
        chargerId: c.chargerId,
        brand: c.client?.clientDetails?.brandName || null,
      }));
      return { success: true, message: 'Chargers fetched successfully', data };
    }

    const page = Math.max(parseInt(query.page ?? '', 10) || 1, 1);
    const limit = Math.max(parseInt(query.limit ?? '', 10) || 25, 1);
    const skip = (page - 1) * limit;

    const [rows, count] = await this.repo.findAndCountPaginated(filters, skip, limit);

    return {
      success: true,
      message: 'Chargers fetched successfully',
      data: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    };
  }

  async getClientChargerById(id: number) {
    const charger = await this.repo.findByIdWithDetails(id);
    if (!charger) {
      throw new NotFoundException({ success: false, message: 'Charger not found' });
    }

    const latestCpoAmc = await this.repo.findLatestCpoAmc(id);

    return {
      success: true,
      message: 'Charger fetched successfully',
      data: { ...charger, cpoAmc: latestCpoAmc ? [latestCpoAmc] : [] },
    };
  }

  async getDeviceLogsOfCharger(id: number, page: number, limit: number, startDate: string | undefined, endDate: string | undefined) {
    const charger = await this.repo.findChargerIdAndBusinessId(id);
    if (!charger) {
      throw new NotFoundException({ success: false, message: 'Charger not found' });
    }

    const skip = (page - 1) * limit;
    const [rows, count] = await this.repo.findAndCountLogs(
      charger.chargerId,
      startDate && endDate ? new Date(startDate) : undefined,
      startDate && endDate ? new Date(endDate) : undefined,
      skip,
      limit,
    );

    return {
      success: true,
      message: 'Device logs fetched successfully',
      data: rows,
      pagination: { totalPages: Math.ceil(count / limit), page, limit, total: count },
    };
  }

  async getLogsDateWise(id: number, startDate: string | undefined, endDate: string | undefined) {
    if (!startDate || !endDate) {
      throw new BadRequestException({ message: 'Both "from" and "to" query parameters are required.' });
    }

    const charger = await this.repo.findChargerIdAndBusinessId(id);
    // Legacy dereferences `charger.chargerId` unconditionally here, which throws if the charger
    // doesn't exist — implemented as the evidently-intended 404 instead of a crash.
    if (!charger) {
      throw new NotFoundException({ message: 'Charger not found' });
    }

    const logs = await this.repo.findLogsInDateRange(charger.chargerId, new Date(startDate), new Date(endDate));
    return { success: true, message: 'Date wise Logs fetched successfully', logs };
  }

  async getClientSessionsByChargerId(id: number, page: number, limit: number) {
    const charger = await this.repo.findChargerIdAndBusinessId(id);
    if (!charger) {
      // Legacy uses `msg` (not `message`) for this one 404 — preserved exactly.
      throw new HttpException({ success: false, msg: 'Charger not found' }, HttpStatus.NOT_FOUND);
    }

    const skip = (page - 1) * limit;
    const [rows, count] = await this.repo.findAndCountSessions(charger.chargerId, skip, limit);

    return {
      success: true,
      message: 'Sessions fetched successfully',
      data: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    };
  }
}
