import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { DeviceTransaction } from '../../../sessions/src/entities/device-transaction.entity';
import { TransactionDetail } from '../../../sessions/src/entities/transaction-detail.entity';
import { FleetUser } from '../../../fleet/src/entities/fleet-user.entity';
import { Charger } from '../../../chargers/src/entities/charger.entity';

export interface VendorDeviceTransactionFilters {
  search?: string;
  status?: string;
  stationId?: string;
  chargerId?: string;
}

export interface VendorDeviceTransactionDownloadFilters {
  stationIds: number[];
  chargerIds: number[];
  startDate: Date;
  endDate: Date;
  applyGst: boolean;
}

/** Mirrors `controllers/vendors/deviceTransactionController.js`. */
@Injectable()
export class VendorDeviceTransactionRepository {
  constructor(
    @InjectRepository(Charger) private readonly chargerRepo: Repository<Charger>,
    @InjectRepository(DeviceTransaction) private readonly deviceTransactionRepo: Repository<DeviceTransaction>,
    @InjectRepository(TransactionDetail) private readonly transactionDetailRepo: Repository<TransactionDetail>,
    @InjectRepository(FleetUser) private readonly fleetUserRepo: Repository<FleetUser>,
  ) {}

  findChargerIdsByVendor(vendorId: number) {
    return this.chargerRepo.find({ where: { vendorId }, select: { id: true } });
  }

  async findAndCountForVendor(chargerIds: number[], filters: VendorDeviceTransactionFilters, stationIdParam: string | undefined, skip: number, take: number) {
    const qb = this.deviceTransactionRepo
      .createQueryBuilder('dt')
      .leftJoin('dt.charger', 'charger')
      .addSelect(['charger.id'])
      .leftJoin('charger.station', 'station')
      .addSelect(['station.stationUniqueId', 'station.id', 'station.name'])
      .leftJoin('dt.user', 'user')
      .addSelect(['user.userId', 'user.first_name', 'user.phone'])
      .leftJoin('dt.vehicle', 'vehicle')
      .addSelect(['vehicle.regNo', 'vehicle.id'])
      .leftJoin('dt.fleetUser', 'fleetUser')
      .addSelect(['fleetUser.id', 'fleetUser.cName', 'fleetUser.fleetUId'])
      .leftJoin('dt.initiatedClient', 'initiatedClient')
      .addSelect(['initiatedClient.id', 'initiatedClient.first_name', 'initiatedClient.last_name'])
      .leftJoin('initiatedClient.clientDetails', 'clientDetails')
      .addSelect(['clientDetails.id', 'clientDetails.brandName', 'clientDetails.clientId', 'clientDetails.primaryColor'])
      // Legacy overrides (not intersects) the vendor's charger-id scoping whenever a `chargerId`
      // filter is supplied, which would let a vendor read another tenant's transaction by id —
      // scoped here so the vendor's own charger set is always enforced.
      .where('dt.chargerRef IN (:...chargerIds)', { chargerIds: chargerIds.length ? chargerIds : [0] });

    if (filters.status !== undefined) {
      qb.andWhere('dt.status = :status', { status: filters.status });
    }
    if (filters.chargerId) {
      qb.andWhere('dt.chargerRef = :chargerIdFilter', { chargerIdFilter: filters.chargerId });
    }
    if (stationIdParam) {
      qb.andWhere('charger.stationId = :stationIdParam', { stationIdParam });
    }

    if (filters.search) {
      const s = `%${filters.search}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('CAST(dt.transactionId AS CHAR) LIKE :s', { s })
            .orWhere('CAST(dt.reason AS CHAR) LIKE :s', { s })
            .orWhere('user.userId LIKE :s OR user.first_name LIKE :s', { s })
            .orWhere('fleetUser.cName LIKE :s', { s })
            .orWhere('fleetUser.fleetUId LIKE :s', { s });
        }),
      );
    }

    qb.orderBy('dt.id', 'DESC').skip(skip).take(take);

    const [rows, count] = await qb.getManyAndCount();

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

  async findForDownload(filters: VendorDeviceTransactionDownloadFilters, vendorId: number) {
    const qb = this.deviceTransactionRepo
      .createQueryBuilder('dt')
      .innerJoin('dt.charger', 'charger')
      .addSelect(['charger.id', 'charger.chargerId', 'charger.vendorId', 'charger.stationId'])
      .leftJoin('charger.station', 'station')
      .addSelect(['station.id', 'station.name'])
      // Legacy's `where` on this include has explicit `required:false`, so Sequelize applies the
      // gst filter in the JOIN's ON clause (unmatched users come back as null) rather than
      // excluding the whole transaction row — replicated as a conditional join clause, not a WHERE.
      .leftJoin('dt.user', 'user', filters.applyGst ? "user.gst IS NOT NULL AND user.gst != ''" : undefined)
      .addSelect(['user.id', 'user.userId', 'user.gst', 'user.first_name', 'user.phone'])
      .leftJoin('dt.fleetUser', 'fleetUser')
      .addSelect(['fleetUser.id', 'fleetUser.cName', 'fleetUser.fleetUId', 'fleetUser.gst'])
      .where('dt.createdAt BETWEEN :start AND :end', { start: filters.startDate, end: filters.endDate })
      .andWhere('charger.vendorId = :vendorId', { vendorId });

    if (filters.stationIds.length > 0) {
      qb.andWhere('charger.stationId IN (:...stationIds)', { stationIds: filters.stationIds });
    }
    if (filters.chargerIds.length > 0) {
      qb.andWhere('charger.id IN (:...chargerIds)', { chargerIds: filters.chargerIds });
    }

    qb.orderBy('dt.createdAt', 'ASC');

    const rows = await qb.getMany();

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
      }),
    );

    return rows;
  }
}
