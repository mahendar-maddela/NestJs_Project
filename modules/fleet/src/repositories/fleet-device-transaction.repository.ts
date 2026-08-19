import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { DeviceTransaction } from '../../../sessions/src/entities/device-transaction.entity';

export interface FleetDeviceTransactionFilters {
  search?: string;
  vehicle?: string;
  driver?: string;
  charger?: string;
  startDate?: string;
  endDate?: string;
  reason?: string;
}

/** Mirrors `controllers/Fleet/deviceTransactionsController.js`. */
@Injectable()
export class FleetDeviceTransactionRepository {
  constructor(@InjectRepository(DeviceTransaction) private readonly repo: Repository<DeviceTransaction>) {}

  async findAndCountByFleet(fleetId: number, filters: FleetDeviceTransactionFilters, page: number, limit: number) {
    const reason = filters.reason || 'all';
    let resolvedPage = page;

    const qb = this.repo
      .createQueryBuilder('dt')
      .leftJoinAndSelect('dt.vehicle', 'vehicle')
      .leftJoinAndSelect('dt.startDriver', 'startDriver')
      .leftJoinAndSelect('dt.stopDriver', 'stopDriver')
      .leftJoinAndSelect('dt.charger', 'charger')
      .leftJoinAndSelect('charger.station', 'station')
      .where('dt.fleetId = :fleetId', { fleetId });

    // Legacy assigns both the `search` OR-clause and the `driver` OR-clause to the same
    // `Op.or` key on the where object — when `driver` is present it silently overwrites (drops)
    // the search clause rather than combining with it. Preserved as-is below.
    const hasDriverFilter = Boolean(filters.driver && filters.driver !== 'all');

    if (!hasDriverFilter && filters.search && filters.search.trim()) {
      const s = `%${filters.search.trim()}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('dt.transactionId LIKE :s', { s })
            .orWhere('dt.chargerId LIKE :s', { s })
            .orWhere('vehicle.regNo LIKE :s', { s })
            .orWhere('vehicle.vinNumber LIKE :s', { s })
            .orWhere('startDriver.name LIKE :s', { s })
            .orWhere('startDriver.email LIKE :s', { s })
            .orWhere('stopDriver.name LIKE :s', { s })
            .orWhere('stopDriver.email LIKE :s', { s });
        }),
      );
    }

    if (reason === 'Vehicle Mismatch') {
      qb.andWhere('dt.reason = :reason', { reason: 'Vehicle Mismatch' });
    } else if (reason === 'Fleet') {
      qb.andWhere('(dt.reason != :reason OR dt.reason IS NULL)', { reason: 'Vehicle Mismatch' });
    }

    if (filters.charger) {
      resolvedPage = 1;
      qb.andWhere('dt.chargerId = :charger', { charger: filters.charger });
    }

    if (filters.startDate || filters.endDate) {
      const istOffsetMs = 5.5 * 60 * 60 * 1000;
      if (filters.startDate) {
        const startUtc = new Date(new Date(`${filters.startDate}T00:00:00`).getTime() - istOffsetMs);
        qb.andWhere('dt.createdAt >= :startUtc', { startUtc });
      }
      if (filters.endDate) {
        const endUtc = new Date(new Date(`${filters.endDate}T23:59:59`).getTime() - istOffsetMs);
        qb.andWhere('dt.createdAt <= :endUtc', { endUtc });
      }
    }

    if (filters.vehicle && filters.vehicle !== 'all') {
      resolvedPage = 1;
      qb.andWhere('vehicle.regNo = :regNo', { regNo: filters.vehicle });
    }

    if (filters.driver && filters.driver !== 'all') {
      resolvedPage = 1;
      qb.andWhere('(dt.stopDriverId = :driver OR dt.startDriverId = :driver)', { driver: filters.driver });
    }

    qb.orderBy('dt.startDate', 'DESC')
      .skip((resolvedPage - 1) * limit)
      .take(limit);

    const [rows, count] = await qb.getManyAndCount();
    return { rows, count, page: resolvedPage };
  }
}
