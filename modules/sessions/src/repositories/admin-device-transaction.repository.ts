import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { DeviceTransaction } from '../entities/device-transaction.entity';
import { TransactionDetail } from '../entities/transaction-detail.entity';
import { FleetUser } from '../../../fleet/src/entities/fleet-user.entity';

const LIST_SELECT = [
  'dt.id',
  'dt.transactionId',
  'dt.chargerId',
  'dt.connectorId',
  'dt.totalWh',
  'dt.price',
  'dt.charginDuration',
  'dt.startDate',
  'dt.stopDate',
  'dt.platform',
  'dt.stopFrom',
  'dt.gst',
  'dt.amount',
  'dt.status',
  'dt.reason',
  'dt.startSoc',
  'dt.stopSoc',
  'dt.macId',
];

export interface DeviceTransactionFilters {
  search?: string;
  chargerRef?: number;
  vendorId?: number;
  stationId?: number;
}

export interface CrossClientDeviceTransactionFilters extends DeviceTransactionFilters {
  clientId?: number;
  status?: number;
}

@Injectable()
export class AdminDeviceTransactionRepository {
  constructor(
    @InjectRepository(DeviceTransaction) private readonly repo: Repository<DeviceTransaction>,
    @InjectRepository(TransactionDetail) private readonly transactionDetailRepo: Repository<TransactionDetail>,
    @InjectRepository(FleetUser) private readonly fleetUserRepo: Repository<FleetUser>,
  ) {}

  async findFleetManagersByFleetIds(fleetIds: number[]) {
    if (!fleetIds.length) return new Map<number, { id: number; phone: string | null; email?: string | null }>();
    const rows = await this.fleetUserRepo.find({
      where: { fleetId: In(fleetIds), type: 'FLEET_MANAGER' },
      select: { id: true, fleetId: true, phone: true, email: true },
      order: { id: 'ASC' },
    });
    const map = new Map<number, { id: number; phone: string | null; email?: string | null }>();
    for (const row of rows) {
      if (row.fleetId != null && !map.has(row.fleetId)) map.set(row.fleetId, { id: row.id, phone: row.phone, email: row.email });
    }
    return map;
  }

  async findAndCountAllTransactions(clientId: number, filters: DeviceTransactionFilters, skip: number, take: number) {
    const qb = this.repo
      .createQueryBuilder('dt')
      .select(LIST_SELECT)
      .innerJoin('dt.charger', 'charger')
      .addSelect(['charger.id'])
      .innerJoin('charger.station', 'station')
      .addSelect(['station.id', 'station.stationUniqueId', 'station.vendorId', 'station.name'])
      .leftJoin('dt.user', 'user')
      .addSelect(['user.id', 'user.first_name', 'user.userId', 'user.phone', 'user.email'])
      .leftJoin('dt.emsp', 'emsp')
      .addSelect(['emsp.id', 'emsp.business_name', 'emsp.party_id'])
      .leftJoin('dt.vehicle', 'vehicle')
      .addSelect(['vehicle.id', 'vehicle.regNo'])
      .leftJoin('dt.fleetUser', 'fleetUser')
      .addSelect(['fleetUser.id', 'fleetUser.cName', 'fleetUser.fleetUId'])
      .leftJoin('dt.initiatedClient', 'initiatedClient')
      .addSelect(['initiatedClient.id', 'initiatedClient.first_name', 'initiatedClient.last_name'])
      .leftJoin('initiatedClient.clientDetails', 'initiatedClientDetails')
      .addSelect(['initiatedClientDetails.id', 'initiatedClientDetails.brandName', 'initiatedClientDetails.clientId', 'initiatedClientDetails.primaryColor'])
      .where('charger.clientId = :clientId', { clientId });

    if (filters.chargerRef) qb.andWhere('charger.id = :chargerRef', { chargerRef: filters.chargerRef });
    if (filters.vendorId) qb.andWhere('charger.vendorId = :vendorId', { vendorId: filters.vendorId });
    if (filters.stationId) qb.andWhere('station.id = :stationId', { stationId: filters.stationId });

    if (filters.search) {
      const s = `%${filters.search}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('dt.transactionId LIKE :s', { s })
            .orWhere('dt.macId LIKE :s', { s })
            .orWhere('dt.reason LIKE :s', { s })
            .orWhere('user.userId LIKE :s', { s })
            .orWhere('user.first_name LIKE :s', { s })
            .orWhere('fleetUser.fleetUId LIKE :s', { s })
            .orWhere('fleetUser.cName LIKE :s', { s });
        }),
      );
    }

    qb.orderBy('dt.id', 'DESC').skip(skip).take(take);

    const [rows, count] = await qb.getManyAndCount();
    return [rows, count] as const;
  }

  async findAndCountByCharger(chargerRef: number, clientId: number, skip: number, take: number) {
    const qb = this.repo
      .createQueryBuilder('dt')
      .innerJoin('dt.charger', 'charger')
      .addSelect(['charger.id'])
      .leftJoin('charger.station', 'station')
      .addSelect(['station.id', 'station.stationUniqueId'])
      .leftJoin('dt.user', 'user')
      .addSelect(['user.id', 'user.userId', 'user.first_name', 'user.phone'])
      .leftJoin('dt.emsp', 'emsp')
      .addSelect(['emsp.id', 'emsp.business_name', 'emsp.party_id'])
      .leftJoin('dt.fleetUser', 'fleetUser')
      .addSelect(['fleetUser.id', 'fleetUser.cName', 'fleetUser.fleetUId'])
      .leftJoin('dt.vehicle', 'vehicle')
      .addSelect(['vehicle.id', 'vehicle.regNo'])
      .leftJoin('dt.initiatedClient', 'initiatedClient')
      .addSelect(['initiatedClient.id', 'initiatedClient.first_name', 'initiatedClient.last_name'])
      .leftJoin('initiatedClient.clientDetails', 'initiatedClientDetails')
      .addSelect(['initiatedClientDetails.id', 'initiatedClientDetails.brandName', 'initiatedClientDetails.clientId', 'initiatedClientDetails.primaryColor'])
      .where('dt.chargerRef = :chargerRef', { chargerRef })
      .andWhere('charger.clientId = :clientId', { clientId })
      .orderBy('dt.id', 'DESC')
      .skip(skip)
      .take(take);

    const [rows, count] = await qb.getManyAndCount();
    return [rows, count] as const;
  }

  // Mirrors `controllers/suparAdmin/deviceTransactionController.js:getAllClientDeviceTransactions`
  // — cross-client (clientId is an optional filter, not a mandatory scope), uses the top-level
  // `client` relation (not `initiatedClient`), and adds a `status` filter.
  async findAndCountAllTransactionsCrossClient(filters: CrossClientDeviceTransactionFilters, skip: number, take: number) {
    const qb = this.repo
      .createQueryBuilder('dt')
      .select(LIST_SELECT)
      .innerJoin('dt.charger', 'charger')
      .addSelect(['charger.id'])
      .innerJoin('charger.station', 'station')
      .addSelect(['station.id', 'station.stationUniqueId', 'station.vendorId', 'station.name'])
      .leftJoin('dt.user', 'user')
      .addSelect(['user.id', 'user.first_name', 'user.userId', 'user.phone', 'user.email'])
      .leftJoin('dt.emsp', 'emsp')
      .addSelect(['emsp.id', 'emsp.business_name', 'emsp.party_id'])
      .leftJoin('dt.vehicle', 'vehicle')
      .addSelect(['vehicle.id', 'vehicle.regNo'])
      .leftJoin('dt.fleetUser', 'fleetUser')
      .addSelect(['fleetUser.id', 'fleetUser.cName', 'fleetUser.fleetUId'])
      .leftJoin('dt.client', 'client')
      .addSelect(['client.id', 'client.first_name', 'client.last_name'])
      .leftJoin('client.clientDetails', 'clientDetails')
      .addSelect(['clientDetails.id', 'clientDetails.brandName']);

    if (filters.clientId) qb.andWhere('dt.clientId = :clientId', { clientId: filters.clientId });
    if (filters.chargerRef) qb.andWhere('dt.chargerRef = :chargerRef', { chargerRef: filters.chargerRef });
    if (filters.vendorId) qb.andWhere('charger.vendorId = :vendorId', { vendorId: filters.vendorId });
    if (filters.stationId) qb.andWhere('station.id = :stationId', { stationId: filters.stationId });
    if (filters.status !== undefined) qb.andWhere('dt.status = :status', { status: filters.status });

    if (filters.search) {
      const s = `%${filters.search}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('dt.transactionId LIKE :s', { s })
            .orWhere('dt.macId LIKE :s', { s })
            .orWhere('dt.reason LIKE :s', { s })
            .orWhere('user.userId LIKE :s', { s })
            .orWhere('user.first_name LIKE :s', { s })
            .orWhere('fleetUser.fleetUId LIKE :s', { s })
            .orWhere('fleetUser.cName LIKE :s', { s });
        }),
      );
    }

    qb.orderBy('dt.id', 'DESC').skip(skip).take(take);

    const [rows, count] = await qb.getManyAndCount();
    return [rows, count] as const;
  }

  // Mirrors `controllers/suparAdmin/deviceTransactionController.js:getTransactionsByCharger` —
  // cross-client (no clientId scope at all in legacy), uses the top-level `client` relation.
  async findAndCountByChargerCrossClient(chargerRef: number, skip: number, take: number) {
    const qb = this.repo
      .createQueryBuilder('dt')
      .innerJoin('dt.charger', 'charger')
      .addSelect(['charger.id', 'charger.chargerId', 'charger.clientId'])
      .leftJoin('charger.client', 'chargerClient')
      .addSelect(['chargerClient.id', 'chargerClient.first_name', 'chargerClient.last_name'])
      .leftJoin('chargerClient.clientDetails', 'chargerClientDetails')
      .addSelect(['chargerClientDetails.id', 'chargerClientDetails.brandName'])
      .leftJoin('charger.station', 'station')
      .addSelect(['station.id', 'station.stationUniqueId'])
      .leftJoin('dt.user', 'user')
      .addSelect(['user.id', 'user.userId', 'user.first_name', 'user.phone'])
      .leftJoin('dt.emsp', 'emsp')
      .addSelect(['emsp.id', 'emsp.business_name', 'emsp.party_id'])
      .leftJoin('dt.fleetUser', 'fleetUser')
      .addSelect(['fleetUser.id', 'fleetUser.cName', 'fleetUser.fleetUId'])
      .leftJoin('dt.vehicle', 'vehicle')
      .addSelect(['vehicle.id', 'vehicle.regNo'])
      .where('dt.chargerRef = :chargerRef', { chargerRef })
      .orderBy('dt.id', 'DESC')
      .skip(skip)
      .take(take);

    const [rows, count] = await qb.getManyAndCount();
    return [rows, count] as const;
  }

  async findLatestTransactionDetailsByRefs(transactionRefs: number[]) {
    if (!transactionRefs.length) return new Map<number, TransactionDetail>();
    const rows = await this.transactionDetailRepo.find({
      where: { transactionRef: In(transactionRefs) },
      select: { id: true, transactionId: true, currentImportEv: true, powerOffered: true, voltageEv: true, transactionRef: true },
      order: { id: 'DESC' },
    });
    const map = new Map<number, TransactionDetail>();
    for (const row of rows) {
      if (row.transactionRef != null && !map.has(row.transactionRef)) map.set(row.transactionRef, row);
    }
    return map;
  }

  /** Mirrors `controllers/admin/fleet/deviceTransactionController.js`. */
  async findAndCountByFleet(
    fleetId: number,
    clientId: number | undefined,
    filters: { search?: string; chargerRef?: number; vendorId?: number; stationId?: number },
    skip: number,
    take: number,
  ) {
    const qb = this.repo
      .createQueryBuilder('dt')
      .select(LIST_SELECT)
      .innerJoin('dt.charger', 'charger')
      .addSelect(['charger.id'])
      .innerJoin('charger.station', 'station')
      .addSelect(['station.id', 'station.stationUniqueId', 'station.vendorId'])
      .innerJoin('dt.fleetUser', 'fleetUser')
      .addSelect(['fleetUser.id'])
      .where('fleetUser.id = :fleetId', { fleetId });

    if (clientId) qb.andWhere('charger.clientId = :clientId', { clientId });

    qb
      .leftJoin('dt.startDriver', 'startDriver')
      .addSelect(['startDriver.id', 'startDriver.name', 'startDriver.drId'])
      .leftJoin('dt.stopDriver', 'stopDriver')
      .addSelect(['stopDriver.id', 'stopDriver.name', 'stopDriver.drId'])
      .leftJoin('dt.vehicle', 'vehicle')
      .addSelect(['vehicle.id', 'vehicle.regNo']);

    if (filters.vendorId) qb.andWhere('station.vendorId = :vendorId', { vendorId: filters.vendorId });
    if (filters.stationId) qb.andWhere('station.id = :stationId', { stationId: filters.stationId });

    if (filters.search) {
      // Legacy's search branch replaces the entire where clause, so chargerId filtering is
      // skipped whenever `search` is present — preserved as-is (fleet scoping still holds via the join).
      const s = `%${filters.search}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub.where('dt.transactionId LIKE :s', { s }).orWhere('dt.macId LIKE :s', { s });
        }),
      );
    } else if (filters.chargerRef) {
      qb.andWhere('dt.chargerRef = :chargerRef', { chargerRef: filters.chargerRef });
    }

    qb.orderBy('dt.id', 'DESC').skip(skip).take(take);

    const [rows, count] = await qb.getManyAndCount();
    return [rows, count] as const;
  }

  async findAndCountMeterTransactions(transactionId: number, skip: number, take: number) {
    const [rows, count] = await this.transactionDetailRepo.findAndCount({
      where: { transactionId },
      skip,
      take,
    });
    return [rows, count] as const;
  }
}
