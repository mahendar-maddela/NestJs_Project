import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { RoamingClient } from '../entities/roaming-client.entity';
import { InternalRoaming } from '../entities/internal-roaming.entity';
import { RoamingTariff } from '../entities/roaming-tariff.entity';
import { Charger } from '../../../chargers/src/entities/charger.entity';
import { Tariff } from '../../../tariffs/src/entities/tariff.entity';
import { DeviceTransaction } from '../../../sessions/src/entities/device-transaction.entity';
import { Staff } from '../../../clients/src/entities/staff.entity';
import { ClientFeature } from '../../../clients/src/entities/client-feature.entity';
import { ClientFeatureMapping } from '../../../clients/src/entities/client-feature-mapping.entity';

export interface RoamingAnalyticsFilters {
  /** clientId of the tenant that owns the charger (DeviceTransaction.clientId). */
  chargerClientId: number;
  /** clientId of the tenant that initiated the session (DeviceTransaction.initiatedClientId). */
  initiatedClientId: number;
  chargerRef?: number;
  vendorId?: number;
  stationId?: number;
}

@Injectable()
export class AdminRoamingRepository {
  constructor(
    @InjectRepository(RoamingClient) private readonly roamingClientRepo: Repository<RoamingClient>,
    @InjectRepository(InternalRoaming) private readonly internalRoamingRepo: Repository<InternalRoaming>,
    @InjectRepository(RoamingTariff) private readonly roamingTariffRepo: Repository<RoamingTariff>,
    @InjectRepository(Charger) private readonly chargerRepo: Repository<Charger>,
    @InjectRepository(Tariff) private readonly tariffRepo: Repository<Tariff>,
    @InjectRepository(DeviceTransaction) private readonly deviceTransactionRepo: Repository<DeviceTransaction>,
    @InjectRepository(Staff) private readonly staffRepo: Repository<Staff>,
    @InjectRepository(ClientFeature) private readonly clientFeatureRepo: Repository<ClientFeature>,
    @InjectRepository(ClientFeatureMapping) private readonly clientFeatureMappingRepo: Repository<ClientFeatureMapping>,
  ) {}

  // ---- Super-admin: cross-client roaming setup ----

  findImportingClients(exceptClientId: number) {
    return this.staffRepo.find({
      where: { clientToken: Not(IsNull()), clientId: Not(exceptClientId) },
      select: { id: true, first_name: true, last_name: true, clientId: true },
      relations: { clientDetails: true },
      order: { createdAt: 'DESC' },
    });
  }

  findClientFeatureByName(name: string) {
    return this.clientFeatureRepo.findOne({ where: { name } });
  }

  findClientFeatureMapping(clientId: number, featureId: number) {
    return this.clientFeatureMappingRepo.findOne({ where: { clientId, featureId } });
  }

  createRoamingClient(data: Partial<RoamingClient>) {
    return this.roamingClientRepo.save(this.roamingClientRepo.create(data));
  }

  // ---- Roaming clients (both directions) ----

  async findAndCountByImportClient(importClientId: number, skip: number, take: number) {
    return this.roamingClientRepo.findAndCount({
      where: { importClientId },
      relations: { exportClient: { clientDetails: true } },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  async findAndCountByExportClient(exportClientId: number, skip: number, take: number) {
    return this.roamingClientRepo.findAndCount({
      where: { exportClientId },
      relations: { importClient: { clientDetails: true } },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  findRoamingClientById(id: number) {
    return this.roamingClientRepo.findOne({ where: { id } });
  }

  findRoamingClientByImportExport(importClientId: number, exportClientId: number) {
    return this.roamingClientRepo.findOne({ where: { importClientId, exportClientId } });
  }

  async updateRoamingClientStatus(id: number, status: string) {
    await this.roamingClientRepo.update(id, { status });
  }

  // ---- Import side: chargers made available to us by an export client ----

  async findAndCountImportedChargers(exportClientId: number, importClientId: number, skip: number, take: number) {
    const qb = this.chargerRepo
      .createQueryBuilder('charger')
      .innerJoinAndSelect('charger.connectors', 'connectors')
      .innerJoin('charger.internalRoamings', 'internalRoaming', 'internalRoaming.exportClientId = :exportClientId AND internalRoaming.importClientId = :importClientId', { exportClientId, importClientId })
      .addSelect(['internalRoaming.id', 'internalRoaming.status', 'internalRoaming.roamingId'])
      .leftJoin('charger.roamingTariffs', 'roamingTariffs', 'roamingTariffs.importClientId = :importClientId2', { importClientId2: importClientId })
      .addSelect(['roamingTariffs.id', 'roamingTariffs.price', 'roamingTariffs.gst'])
      .leftJoinAndSelect('charger.station', 'station')
      .orderBy('charger.createdAt', 'DESC')
      .skip(skip)
      .take(take);

    return qb.getManyAndCount();
  }

  // ---- Export side: our chargers, offered or offerable to an import client ----

  async findAndCountExportableChargers(
    clientId: number,
    importClientId: number,
    roamingChargerIds: number[],
    isRoaming: boolean,
    search: string | undefined,
    skip: number,
    take: number,
  ) {
    const qb = this.chargerRepo
      .createQueryBuilder('charger')
      .leftJoinAndSelect('charger.station', 'station')
      .leftJoinAndSelect('charger.vendor', 'vendor')
      .leftJoin('charger.roamingTariffs', 'roamingTariffs', 'roamingTariffs.importClientId = :importClientId', { importClientId })
      .addSelect(['roamingTariffs.id', 'roamingTariffs.price', 'roamingTariffs.gst'])
      .leftJoinAndSelect('charger.internalRoamings', 'internalRoaming')
      .where('charger.clientId = :clientId', { clientId });

    if (roamingChargerIds.length) {
      qb.andWhere(isRoaming ? 'charger.id IN (:...roamingChargerIds)' : 'charger.id NOT IN (:...roamingChargerIds)', { roamingChargerIds });
    } else if (isRoaming) {
      qb.andWhere('1 = 0');
    }

    if (search) {
      const s = `%${search}%`;
      qb.andWhere('(charger.chargerId LIKE :s OR charger.capacity LIKE :s OR charger.status LIKE :s OR charger.powerType LIKE :s)', { s });
    }

    qb.orderBy('charger.createdAt', 'DESC').skip(skip).take(take);

    return qb.getManyAndCount();
  }

  findInternalRoamingChargerIds(exportClientId: number, importClientId: number) {
    return this.internalRoamingRepo.find({ where: { exportClientId, importClientId }, select: { chargerId: true } });
  }

  findChargerByIdAndClient(id: number, clientId: number) {
    return this.chargerRepo.findOne({ where: { id, clientId }, select: { id: true, vendorId: true } });
  }

  findInternalRoaming(exportClientId: number, importClientId: number, chargerId: number, roamingId?: number) {
    return this.internalRoamingRepo.findOne({ where: { exportClientId, importClientId, chargerId, ...(roamingId ? { roamingId } : {}) } });
  }

  createInternalRoaming(data: Partial<InternalRoaming>) {
    return this.internalRoamingRepo.save(this.internalRoamingRepo.create(data));
  }

  findRoamingTariff(chargerId: number, clientId: number, importClientId: number) {
    return this.roamingTariffRepo.findOne({ where: { chargerId, clientId, importClientId } });
  }

  createRoamingTariff(data: Partial<RoamingTariff>) {
    return this.roamingTariffRepo.save(this.roamingTariffRepo.create(data));
  }

  async updateRoamingTariff(id: number, data: Partial<RoamingTariff>) {
    await this.roamingTariffRepo.update(id, data as any);
  }

  findGeneralTariff(chargerId: number, clientId: number) {
    return this.tariffRepo.findOne({ where: { chargerId, clientId, userTypeId: IsNull() } });
  }

  findInternalRoamingByExportImportCharger(exportClientId: number, importClientId: number, chargerId: number) {
    return this.internalRoamingRepo.findOne({ where: { exportClientId, importClientId, chargerId } });
  }

  async updateInternalRoamingStatus(id: number, status: string) {
    await this.internalRoamingRepo.update(id, { status: status as any });
  }

  // ---- Sessions ----

  async findAndCountSessions(chargerClientId: number, initiatedClientId: number, skip: number, take: number) {
    return this.deviceTransactionRepo.findAndCount({
      where: { clientId: chargerClientId, initiatedClientId },
      relations: { user: true, vehicle: true },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  private roamingTxQb(filters: RoamingAnalyticsFilters) {
    const qb = this.deviceTransactionRepo
      .createQueryBuilder('dt')
      .innerJoin('dt.charger', 'charger')
      .where('dt.clientId = :chargerClientId', { chargerClientId: filters.chargerClientId })
      .andWhere('dt.initiatedClientId = :initiatedClientId', { initiatedClientId: filters.initiatedClientId })
      .andWhere('dt.status = 1')
      .andWhere('charger.clientId = :chargerClientId', { chargerClientId: filters.chargerClientId });

    if (filters.vendorId) qb.andWhere('charger.vendorId = :vendorId', { vendorId: filters.vendorId });
    if (filters.stationId) qb.andWhere('charger.stationId = :stationId', { stationId: filters.stationId });
    if (filters.chargerRef) qb.andWhere('dt.chargerRef = :chargerRef', { chargerRef: filters.chargerRef });

    return qb;
  }

  async sumRoamingField(filters: RoamingAnalyticsFilters, field: 'price' | 'totalWh', startDate: Date, endDate: Date): Promise<number> {
    const raw = await this.roamingTxQb(filters)
      .andWhere('dt.createdAt >= :startDate AND dt.createdAt <= :endDate', { startDate, endDate })
      .select(`SUM(dt.${field})`, 'total')
      .getRawOne<{ total: string | null }>();
    return Number(raw?.total) || 0;
  }

  async countRoamingTx(filters: RoamingAnalyticsFilters, startDate: Date, endDate: Date): Promise<number> {
    return this.roamingTxQb(filters)
      .andWhere('dt.createdAt >= :startDate AND dt.createdAt <= :endDate', { startDate, endDate })
      .getCount();
  }

  async findAllExportSessionsForDownload(clientId: number, importClientId: number) {
    return this.deviceTransactionRepo.find({
      where: { clientId, initiatedClientId: importClientId },
      relations: { user: true, vehicle: true },
      order: { createdAt: 'DESC' },
    });
  }
}
