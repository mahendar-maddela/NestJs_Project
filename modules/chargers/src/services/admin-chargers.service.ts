import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminChargerRepository } from '../repositories/admin-charger.repository';
import { configureData, logConfigurationKey } from '../constants/charger-config.constants';
import { ChargerStatus, PowerType } from 'database/src';

@Injectable()
export class AdminChargersService {
  constructor(private readonly adminChargerRepository: AdminChargerRepository) { }

  async createCharger(body: any, staffId: number, clientId: number) {
    if (!body.chargerId) {
      throw new BadRequestException({ message: 'Charger ID is required' });
    }

    const cleanChargerId = String(body.chargerId).replace(/\s+/g, '');

    const existing = await this.adminChargerRepository.findChargerByChargerId(cleanChargerId);
    if (existing) {
      throw new BadRequestException({ message: 'Charger ID already exists' });
    }

    const station = await this.adminChargerRepository.findStationById(Number(body.stationId));
    if (!station) {
      throw new NotFoundException({ message: 'Station not found' });
    }

    if (station.vendorId != Number(body.vendorId)) {
      throw new BadRequestException({ message: 'Station does not belong to the specified vendor' });
    }

    const vehicleTypeStr = Array.isArray(body.vehicleType)
      ? body.vehicleType.join(',')
      : String(body.vehicleType || '');

    const parsedPowerType = body.powerType in PowerType ? (body.powerType as PowerType) : undefined;
    const parsedStatus = body.status in ChargerStatus ? (body.status as ChargerStatus) : 'InActive';

    const logConfigs = logConfigurationKey.map((key) => ({ key }));
    const chargerConfigs = configureData.map((item) => ({
      configName: item.key,
      configValue: JSON.stringify(item.value),
      configDescription: item.description,
      accessibility: item.readOnly ? 'R' : 'RW',
    }));

    const newCharger = await this.adminChargerRepository.createChargerWithDetails({
      chargerData: {
        chargerId: cleanChargerId,
        stationId: Number(body.stationId),
        vendorId: Number(body.vendorId),
        capacity: body.capacity ? Number(body.capacity) : undefined,
        network_type: body.network_type,
        portType: body.portType,
        vehicleType: vehicleTypeStr,
        brand: body.brand,
        powerType: parsedPowerType,
        status: parsedStatus as any,
        staffId,
        clientId,
      },
      connectors: body.connectors,
      tariffPrice: body.price ? Number(body.price) : 0,
      gst: body.gst ? Number(body.gst) : 0,
      amcStartDate: body.startDate,
      amcEndDate: body.endDate,
      amcChargeType: body.chargeType,
      amcAmount: body.amount ?? body.amcAmount,
      logConfigs,
      chargerConfigs,
    });

    return {
      success: true,
      message: 'Charger created successfully',
      data: newCharger,
    };
  }

  async getAllChargers(query: any, clientId: number) {
    const page = query.page ? Number(query.page) : undefined;
    const limit = query.limit ? Number(query.limit) : undefined;
    const { vendorType, vendorId, search, stationId } = query;

    const filterParams = {
      clientId,
      vendorId: vendorId ? Number(vendorId) : undefined,
      stationId: stationId ? Number(stationId) : undefined,
      vendorTypeId: vendorType ? Number(vendorType) : undefined,
      search: search ? String(search).trim() : undefined,
    };

    if (!page && !limit) {
      const { chargers } = await this.adminChargerRepository.findSimpleChargers(filterParams);
      return {
        success: true,
        message: 'Chargers fetched successfully (all data, no pagination)',
        data: chargers,
      };
    }

    const currentPage = page || 1;
    const currentLimit = limit || 10;
    const skip = (currentPage - 1) * currentLimit;

    const { count, rows } = await this.adminChargerRepository.findPaginatedChargers(filterParams, skip, currentLimit);

    return {
      success: true,
      message: 'Chargers fetched successfully',
      data: rows,
      pagination: {
        totalPages: Math.ceil(count / currentLimit),
        page: currentPage,
      },
    };
  }

  async getChargerById(id: number, clientId: number) {
    const charger = await this.adminChargerRepository.findChargerByIdAndClient(id, clientId);

    if (!charger) {
      throw new NotFoundException({ message: 'Charger not found' });
    }

    return {
      success: true,
      message: 'Charger fetched successfully',
      data: charger,
    };
  }

  async updateCharger(id: number, body: any, clientId: number) {
    const charger = await this.adminChargerRepository.findChargerByIdAndClient(id, clientId);
    if (!charger) {
      throw new NotFoundException({ message: 'Charger not found' });
    }

    const vehicleTypeStr = body.vehicleType
      ? Array.isArray(body.vehicleType)
        ? body.vehicleType.join(',')
        : String(body.vehicleType)
      : undefined;

    const hasPowerType = body.powerType !== undefined;
    const parsedPowerType = hasPowerType && body.powerType in PowerType ? (body.powerType as PowerType) : undefined;

    const hasStatus = body.status !== undefined;
    const parsedStatus = hasStatus && body.status in ChargerStatus ? (body.status as ChargerStatus) : undefined;

    await this.adminChargerRepository.updateChargerWithDetails(id, {
      chargerData: {
        ...(body.capacity !== undefined ? { capacity: Number(body.capacity) } : {}),
        ...(body.brand !== undefined ? { brand: body.brand } : {}),
        ...(body.portType !== undefined ? { portType: body.portType } : {}),
        ...(body.vehicleType !== undefined ? { vehicleType: vehicleTypeStr } : {}),
        ...(hasPowerType ? { powerType: parsedPowerType } : {}),
        ...(hasStatus ? { status: parsedStatus as any } : {}),
        ...(body.stationId !== undefined ? { stationId: Number(body.stationId) } : {}),
        ...(body.vendorId !== undefined ? { vendorId: Number(body.vendorId) } : {}),
      },
      connectors: body.connectors,
      tariffPrice: body.price !== undefined ? Number(body.price) : undefined,
      gst: body.gst !== undefined ? Number(body.gst) : undefined,
      amcStartDate: body.startDate,
      amcEndDate: body.endDate,
      amcChargeType: body.chargeType,
      amcAmount: body.amount ?? body.amcAmount,
      clientId,
    });

    return {
      success: true,
      message: 'Charger and connectors updated successfully',
    };
  }

  async deleteCharger(id: number, clientId: number) {
    const charger = await this.adminChargerRepository.findChargerByIdAndClient(id, clientId);
    if (!charger) {
      throw new NotFoundException({ message: 'Charger not found' });
    }

    await this.adminChargerRepository.deleteCharger(id);

    return {
      success: true,
      message: 'Charger deleted successfully',
    };
  }

  async getChargerByStationId(stationId: number, clientId: number) {
    const chargers = await this.adminChargerRepository.findChargersByStationId(stationId, clientId);
    return {
      success: true,
      message: 'Chargers fetched successfully',
      data: chargers,
    };
  }

  async chargeDetails(chargerId: string, spec?: string) {
    const numericRef = Number(chargerId);

    if (spec === 'specification') {
      const chargeDetails = await this.adminChargerRepository.findChargerSpecification(numericRef);
      return {
        success: true,
        message: 'Charge details fetched successfully',
        chargeDetails,
      };
    }

    const chargeDetails = await this.adminChargerRepository.findChargerConfigurations(numericRef);
    return {
      success: true,
      message: 'Charge details fetched successfully',
      chargeDetails,
    };
  }

  async deviceLogs(id: number, query: any, clientId: number) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 100;
    const skip = (page - 1) * limit;

    const charger = await this.adminChargerRepository.findChargerByIdAndClient(id, clientId);
    if (!charger) {
      throw new NotFoundException({ success: false, message: 'Charger not found' });
    }

    const whereCondition: any = {
      chargerId: charger.chargerId,
    };

    if (query.startDate && query.endDate) {
      whereCondition.createdAt = {
        gte: new Date(query.startDate),
        lte: new Date(query.endDate),
      };
    }

    const { count, rows } = await this.adminChargerRepository.findLogs(whereCondition, skip, limit);

    return {
      success: true,
      message: 'Device logs fetched successfully',
      logs: rows,
      pagination: {
        totalPages: Math.ceil(count / limit),
        page,
        limit,
      },
    };
  }

  async getLogsDateWise(id: number, query: any, clientId: number) {
    const { startDate, endDate } = query;

    if (!startDate || !endDate) {
      throw new BadRequestException({
        message: 'Both "startDate" and "endDate" query parameters are required.',
      });
    }

    const charger = await this.adminChargerRepository.findChargerByIdAndClient(id, clientId);
    if (!charger) {
      throw new NotFoundException({ message: 'Charger not found' });
    }

    const whereCondition: any = {
      chargerId: charger.chargerId,
      createdAt: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    };

    const logs = await this.adminChargerRepository.findAllLogsDateWise(whereCondition);

    return {
      success: true,
      message: 'Date wise Logs fetched successfully',
      logs,
    };
  }

  async getChargerByIdForConfig(id: number, clientId: number) {
    const charger = await this.adminChargerRepository.findChargerForConfig(id, clientId);
    if (!charger) {
      throw new NotFoundException({ message: 'Charger not found' });
    }
    return {
      success: true,
      message: 'Charger fetched successfully',
      data: charger,
    };
  }
}
