import { Injectable, NotFoundException } from '@nestjs/common';
import { StationRepository } from '../repositories/station.repository';
import { SuperAdminStationQueryDto } from '../dto/station-query.dto';
import { Like } from 'typeorm';

@Injectable()
export class SuperAdminStationsService {
  constructor(private readonly stationRepository: StationRepository) {}

  async getAllClientsStations(query: SuperAdminStationQueryDto) {
    const { vendorType, vendorId, search, clientId, stationType, status, page, limit } = query;

    const base: any = {};
    if (clientId) base.clientId = Number(clientId);
    if (vendorId) base.vendorId = Number(vendorId);
    if (stationType) base.stationType = stationType;
    if (status) base.status = status;
    if (vendorType) base.vendor = { vendorTypeId: Number(vendorType) };

    const stationWhere = search
      ? [
          { ...base, name: Like(`%${search.trim()}%`) },
          { ...base, stationUniqueId: Like(`%${search.trim()}%`) },
        ]
      : base;

    const hasPagination = page !== undefined || limit !== undefined;

    if (!hasPagination) {
      const stations = await this.stationRepository.findSimpleStations(stationWhere);
      return {
        success: true,
        message: 'Stations fetched successfully',
        data: stations,
      };
    }

    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.max(Number(limit) || 25, 1);
    const skip = (pageNum - 1) * limitNum;

    const [count, rows] = await Promise.all([
      this.stationRepository.countStations(stationWhere),
      this.stationRepository.findPaginatedStations(stationWhere, skip, limitNum),
    ]);

    const formattedStations = rows.map((station) => {
      const statusCounts: Record<string, number> = {
        Available: 0,
        Unavailable: 0,
        Faulted: 0,
        Engaged: 0,
      };

      station.chargers?.forEach((charger) => {
        charger.connectors?.forEach((connector) => {
          const currentStatus = connector.status || 'Unavailable';
          statusCounts[currentStatus] = (statusCounts[currentStatus] || 0) + 1;
        });
      });

      return {
        ...station,
        connectorStatusCounts: Object.entries(statusCounts).map(([sStatus, sCount]) => ({
          status: sStatus,
          count: sCount,
        })),
      };
    });

    return {
      success: true,
      message: 'Stations fetched successfully',
      data: formattedStations,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum),
      },
    };
  }

  async getClientStationById(stationId: number) {
    const station = await this.stationRepository.findStationFullDetails(stationId);
    if (!station) {
      throw new NotFoundException({ message: 'Station not found' });
    }

    return {
      success: true,
      message: 'Station fetched successfully',
      data: station,
    };
  }
}
