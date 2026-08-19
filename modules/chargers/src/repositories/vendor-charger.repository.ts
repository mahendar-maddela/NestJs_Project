import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Charger } from '../entities/charger.entity';
import { ChargerSpecification } from '../entities/charger-specification.entity';
import { Logs } from '../entities/logs.entity';
import { DeviceTransaction } from '../../../sessions/src/entities/device-transaction.entity';
import { TransactionDetail } from '../../../sessions/src/entities/transaction-detail.entity';
import { FleetUser } from '../../../fleet/src/entities/fleet-user.entity';

/** Mirrors `controllers/vendors/chargerController.js`. */
@Injectable()
export class VendorChargerRepository {
  constructor(
    @InjectRepository(Charger) private readonly chargerRepo: Repository<Charger>,
    @InjectRepository(ChargerSpecification) private readonly specRepo: Repository<ChargerSpecification>,
    @InjectRepository(Logs) private readonly logsRepo: Repository<Logs>,
    @InjectRepository(DeviceTransaction) private readonly deviceTransactionRepo: Repository<DeviceTransaction>,
    @InjectRepository(TransactionDetail) private readonly transactionDetailRepo: Repository<TransactionDetail>,
    @InjectRepository(FleetUser) private readonly fleetUserRepo: Repository<FleetUser>,
  ) {}

  // Legacy's `where: { userTypeId: null }` on the `tariff` include is a Sequelize INNER JOIN
  // (required defaults to true whenever `where` is set on an include), so chargers with no
  // null-userTypeId tariff row are excluded from the result entirely — replicated below.
  findChargerByBusinessIdAndVendor(chargerId: string, vendorId: number) {
    return this.chargerRepo
      .createQueryBuilder('c')
      .innerJoinAndSelect('c.tariff', 'tariff', 'tariff.userTypeId IS NULL')
      .leftJoinAndSelect('c.connectors', 'connectors')
      .leftJoinAndSelect('c.station', 'station')
      .where('c.chargerId = :chargerId', { chargerId })
      .andWhere('c.vendorId = :vendorId', { vendorId })
      .getRawOne();
  }

  findChargersByStationAndVendor(stationId: number, vendorId: number) {
    return this.chargerRepo.find({
      where: { stationId, vendorId },
      relations: { connectors: true, station: true },
    });
  }

  findSpecificationsByChargerIds(chargerIds: string[]): Promise<ChargerSpecification[]> {
    if (!chargerIds.length) return Promise.resolve([]);
    return this.specRepo.find({
      where: { chargerId: In(chargerIds) },
      select: { id: true, vendorName: true, chargerId: true },
    });
  }

  findChargerRefByBusinessIdAndVendor(chargerId: string, vendorId: number) {
    return this.chargerRepo.findOne({ where: { chargerId, vendorId }, select: { id: true, chargerId: true } });
  }

  async findAndCountDeviceTransactions(chargerId: string, connectorId: string | undefined, skip: number, take: number) {
    const where: Record<string, unknown> = { chargerId };
    if (connectorId) where.connectorId = connectorId;

    const [rows, count] = await this.deviceTransactionRepo.findAndCount({
      where,
      relations: {
        user: true,
        vehicle: true,
        fleetUser: true,
        charger: { station: true },
        initiatedClient: { clientDetails: true },
      },
      select: {
        user: { userId: true, id: true, first_name: true, phone: true },
        vehicle: { regNo: true, id: true },
        charger: { id: true, station: { stationUniqueId: true, id: true, name: true } },
        initiatedClient: {
          id: true,
          first_name: true,
          last_name: true,
          clientDetails: { id: true, brandName: true, clientId: true, primaryColor: true },
        },
      },
      order: { id: 'DESC' },
      skip,
      take,
    });

    // Legacy's `separate: true, limit: 1` sub-includes run one extra query per parent row —
    // replicated here with per-row lookups run in parallel.
    await Promise.all(
      rows.map(async (row) => {
        if (row.fleetUser) {
          const manager = await this.fleetUserRepo.findOne({
            where: { fleetId: row.fleetUser.id, type: 'FLEET_MANAGER' },
            order: { id: 'ASC' },
            select: { id: true, phone: true },
          });
          (row.fleetUser as unknown as { fleetUsers: unknown[] }).fleetUsers = manager ? [manager] : [];
        }

        const detail = await this.transactionDetailRepo.findOne({
          where: { transactionRef: row.id },
          order: { id: 'DESC' },
          select: { id: true, transactionId: true, currentImportEv: true, powerOffered: true, voltageEv: true },
        });
        (row as unknown as { transactionDetails: unknown[] }).transactionDetails = detail ? [detail] : [];
      }),
    );

    return { rows, count };
  }

  async findAndCountDeviceLogs(chargerId: string, skip: number, take: number) {
    const [rows, count] = await this.logsRepo.findAndCount({
      where: { chargerId },
      order: { id: 'DESC' },
      skip,
      take,
    });
    return { rows, count };
  }

  findLogsInRange(chargerId: string, from: Date, to: Date) {
    return this.logsRepo
      .createQueryBuilder('l')
      .where('l.chargerId = :chargerId', { chargerId })
      .andWhere('l.createdAt >= :from', { from })
      .andWhere('l.createdAt <= :to', { to })
      .orderBy('l.id', 'DESC')
      .getMany();
  }

  findChargersForVendor(vendorId: number, powerType: string | undefined, search: string | undefined, stationId: string | undefined) {
    const qb = this.chargerRepo
      .createQueryBuilder('c')
      .select(['c.id', 'c.chargerId', 'c.capacity', 'c.status', 'c.powerType', 'c.stationId'])
      .where('c.vendorId = :vendorId', { vendorId });

    if (search) {
      qb.andWhere('(c.chargerId LIKE :s OR c.capacity LIKE :s)', { s: `%${search}%` });
    }
    if (powerType) qb.andWhere('c.powerType = :powerType', { powerType });
    if (stationId) qb.andWhere('c.stationId = :stationId', { stationId });

    return qb.getMany();
  }

  async findAndCountChargersForVendor(
    vendorId: number,
    powerType: string | undefined,
    search: string | undefined,
    stationId: string | undefined,
    skip: number,
    take: number,
  ) {
    // Two-phase fetch: page over distinct charger ids first (the connectors left-join and
    // tariff/station inner-joins would otherwise multiply rows and break skip/take), then load
    // the full relations for that page — mirrors legacy's `subQuery: false, distinct: true` fix.
    const idQb = this.chargerRepo
      .createQueryBuilder('c')
      .select('c.id', 'id')
      .distinct(true)
      .innerJoin('c.tariff', 'tariff', 'tariff.userTypeId IS NULL')
      .innerJoin('c.station', 'station')
      .where('c.vendorId = :vendorId', { vendorId });

    if (search) {
      idQb.andWhere('(c.chargerId LIKE :s OR c.capacity LIKE :s)', { s: `%${search}%` });
    }
    if (powerType) idQb.andWhere('c.powerType = :powerType', { powerType });
    if (stationId) idQb.andWhere('c.stationId = :stationId', { stationId });

    const countResult = await idQb.getRawMany<{ id: number }>();
    const count = countResult.length;

    const pageIds = countResult
      .map((r) => r.id)
      .sort((a, b) => b - a)
      .slice(skip, skip + take);

    if (!pageIds.length) return { rows: [], count };

    const rows = await this.chargerRepo
      .createQueryBuilder('c')
      .select(['c.id', 'c.chargerId', 'c.capacity', 'c.status', 'c.portType', 'c.network_type', 'c.powerType'])
      .innerJoinAndSelect('c.tariff', 'tariff', 'tariff.userTypeId IS NULL')
      .innerJoinAndSelect('c.station', 'station')
      .leftJoinAndSelect('c.connectors', 'connectors')
      .where('c.id IN (:...pageIds)', { pageIds })
      .getMany();

    const byId = new Map(rows.map((r) => [r.id, r]));
    return { rows: pageIds.map((id) => byId.get(id)).filter(Boolean) as Charger[], count };
  }
}
