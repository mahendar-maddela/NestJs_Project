import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, Like, Repository } from 'typeorm';
import { Charger } from '../../../chargers/src/entities/charger.entity';
import { Logs } from '../../../chargers/src/entities/logs.entity';
import { ChargingSession } from '../../../sessions/src/entities/charging-session.entity';
import { CpoAmc } from '../../../billing/src/entities/cpo-amc.entity';

export interface SuperAdminChargerFilters {
  vendorType?: number;
  vendorId?: number;
  search?: string;
  stationId?: number;
  clientId?: number;
  powerType?: string;
  status?: string;
}

/** Mirrors `controllers/suparAdmin/chargerController.js`. */
@Injectable()
export class SuperAdminChargerRepository {
  constructor(
    @InjectRepository(Charger) private readonly chargerRepo: Repository<Charger>,
    @InjectRepository(Logs) private readonly logsRepo: Repository<Logs>,
    @InjectRepository(ChargingSession) private readonly chargingSessionRepo: Repository<ChargingSession>,
    @InjectRepository(CpoAmc) private readonly cpoAmcRepo: Repository<CpoAmc>,
  ) {}

  private buildWhere(filters: SuperAdminChargerFilters): FindOptionsWhere<Charger> | FindOptionsWhere<Charger>[] {
    const base: FindOptionsWhere<Charger> = {
      ...(filters.clientId && { clientId: filters.clientId }),
      ...(filters.vendorId && { vendorId: filters.vendorId }),
      ...(filters.stationId && { stationId: filters.stationId }),
      ...(filters.powerType && { powerType: filters.powerType as any }),
      ...(filters.status && { connectors: { status: filters.status as any } }),
      ...(filters.vendorType && { vendor: { vendorTypeId: filters.vendorType } }),
    };

    if (filters.search) {
      const s = Like(`%${filters.search}%`);
      return [
        { ...base, chargerId: s },
        { ...base, portType: s },
      ];
    }

    return base;
  }

  findAllSimple(filters: SuperAdminChargerFilters) {
    return this.chargerRepo.find({
      where: this.buildWhere(filters),
      select: {
        id: true,
        clientId: true,
        vendorId: true,
        stationId: true,
        chargerId: true,
        client: {
          id: true,
          clientDetails: {
            brandName: true,
          },
        },
      },
      relations: { client: { clientDetails: true } },
      order: { chargerId: 'ASC' },
    });
  }

  async findAndCountPaginated(filters: SuperAdminChargerFilters, skip: number, take: number) {
    return this.chargerRepo.findAndCount({
      where: this.buildWhere(filters),
      relations: {
        connectors: true,
        station: true,
        vendor: true,
        tariff: true,
        client: { clientDetails: true },
      },
      order: { id: 'DESC' },
      skip,
      take,
    });
  }

  findByIdWithDetails(id: number) {
    return this.chargerRepo.findOne({
      where: { id },
      relations: {
        connectors: true,
        station: true,
        vendor: true,
        tariff: true,
        specification: true,
        client: { clientDetails: true },
      },
      order: { connectors: { connectorId: 'ASC' } },
    });
  }

  findLatestCpoAmc(chargerId: number) {
    return this.cpoAmcRepo.findOne({ where: { chargerId }, order: { createdAt: 'DESC' } });
  }

  findChargerIdAndBusinessId(id: number) {
    return this.chargerRepo.findOne({ where: { id }, select: { id: true, chargerId: true } });
  }

  async findAndCountLogs(chargerId: string, startDate: Date | undefined, endDate: Date | undefined, skip: number, take: number) {
    const where: FindOptionsWhere<Logs> = { chargerId };
    if (startDate && endDate) {
      where.createdAt = Between(startDate, endDate);
    }
    return this.logsRepo.findAndCount({
      where,
      order: { id: 'DESC' },
      skip,
      take,
    });
  }

  findLogsInDateRange(chargerId: string, startDate: Date, endDate: Date) {
    return this.logsRepo.find({
      where: {
        chargerId,
        createdAt: Between(startDate, endDate),
      },
      order: { id: 'DESC' },
    });
  }

  async findAndCountSessions(chargerId: string, skip: number, take: number) {
    return this.chargingSessionRepo.findAndCount({
      where: { chargerId },
      relations: {
        user: true,
        fleetUser: true,
        transaction: true,
        emsp: true,
      },
      order: { id: 'DESC' },
      skip,
      take,
    });
  }
}
