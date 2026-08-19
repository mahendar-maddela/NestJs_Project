import { Injectable } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { OcpiEmsp } from '../entities/ocpi-emsp.entity';
import { OcpiCpo } from '../entities/ocpi-cpo.entity';
import { OcpiToken } from '../entities/ocpi-token.entity';
import { OcpiVersion } from '../entities/ocpi-version.entity';
import { OcpiVersionEndpoint } from '../entities/ocpi-version-endpoint.entity';
import { OcpiPushedTariff } from '../entities/ocpi-pushed-tariff.entity';
import { OcpiPushStation } from '../entities/ocpi-push-station.entity';
import { OcpiCdr } from '../entities/ocpi-cdr.entity';
import { OcpiLog } from '../entities/ocpi-log.entity';

@Injectable()
export class OcpiRepository {
  constructor(
    @InjectRepository(OcpiCpo)
    private readonly ocpiCpoRepo: Repository<OcpiCpo>,
    @InjectRepository(OcpiEmsp)
    private readonly ocpiEmspRepo: Repository<OcpiEmsp>,
    @InjectRepository(OcpiToken)
    private readonly ocpiTokenRepo: Repository<OcpiToken>,
    @InjectRepository(OcpiVersion)
    private readonly ocpiVersionRepo: Repository<OcpiVersion>,
    @InjectRepository(OcpiVersionEndpoint)
    private readonly ocpiVersionEndpointRepo: Repository<OcpiVersionEndpoint>,
    @InjectRepository(OcpiPushedTariff)
    private readonly ocpiPushedTariffRepo: Repository<OcpiPushedTariff>,
    @InjectRepository(OcpiPushStation)
    private readonly ocpiPushStationRepo: Repository<OcpiPushStation>,
    @InjectRepository(OcpiCdr)
    private readonly ocpiCdrRepo: Repository<OcpiCdr>,
    @InjectRepository(OcpiLog)
    private readonly ocpiLogRepo: Repository<OcpiLog>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async findCpoById(id: number) {
    return this.ocpiCpoRepo.findOne({ where: { id } });
  }

  async findEmspById(id: number) {
    return this.ocpiEmspRepo.findOne({ where: { id } });
  }

  async findEmspByTokenA(tokenA: string) {
    return this.ocpiEmspRepo.findOne({ where: { token_a: tokenA } });
  }

  async findEmspByTokenB(tokenB: string) {
    return this.ocpiEmspRepo.findOne({ where: { token_b: tokenB } });
  }

  async findClientDetails(clientId: number) {
    return this.dataSource
      .createQueryBuilder()
      .select('cd.*')
      .from('clientdetails', 'cd')
      .where('cd.clientId = :clientId', { clientId })
      .getRawOne();
  }

  async updateEmsp(id: number, data: Partial<OcpiEmsp>) {
    await this.ocpiEmspRepo.update(id, data as any);
    return this.ocpiEmspRepo.findOne({ where: { id } });
  }

  async findSessionsByEmspId(
    emspId: number,
    filters: { dateFrom?: string; dateTo?: string; skip: number; take: number },
  ) {
    const qb = this.dataSource
      .createQueryBuilder()
      .select('cs.*')
      .from('chargingsessions', 'cs')
      .where('cs.emspId = :emspId', { emspId })
      .skip(filters.skip)
      .take(filters.take);

    if (filters.dateFrom) qb.andWhere('cs.updatedAt >= :dateFrom', { dateFrom: filters.dateFrom });
    if (filters.dateTo) qb.andWhere('cs.updatedAt <= :dateTo', { dateTo: filters.dateTo });

    return qb.getRawMany();
  }

  async findTokenById(id: number | null | undefined) {
    if (!id) return null;
    return this.ocpiTokenRepo.findOne({ where: { id } });
  }

  async findVersion(emspId: number, version: string) {
    return this.ocpiVersionRepo.findOne({ where: { emspId, version } });
  }

  async findVersionEndpoint(versionId: number, identifier: string, role: string) {
    return this.ocpiVersionEndpointRepo.findOne({ where: { versionId, identifier, role } });
  }

  async findPushedTariffs(where: Record<string, unknown>, skip = 0, limit = 10) {
    return this.ocpiPushedTariffRepo.find({
      where: where as any,
      skip,
      take: limit,
      relations: { roamingTariff: true },
    });
  }

  async findPushedStations(where: Record<string, unknown>, skip = 0, limit = 10) {
    return this.ocpiPushStationRepo.find({ where: where as any, skip, take: limit });
  }

  async findCdrs(where: Record<string, unknown>, skip = 0, limit = 10) {
    return this.ocpiCdrRepo.find({
      where: where as any,
      skip,
      take: limit,
      relations: { token: true },
    });
  }

  async createOcpiLog(data: Partial<OcpiLog>) {
    return this.ocpiLogRepo.save(this.ocpiLogRepo.create(data));
  }

  async findOcpiTokenByUid(uid: string) {
    return this.ocpiTokenRepo.findOne({ where: { uid } });
  }

  async createOcpiToken(data: Partial<OcpiToken>) {
    return this.ocpiTokenRepo.save(this.ocpiTokenRepo.create(data));
  }

  /** Mirrors legacy `commandsModule.js:startSession`'s `Charger.findOne({ include: [connectors, roamingTariffs] })`. */
  async findChargerWithConnectorAndTariff(chargerId: string, connectorId: string, emspId: number): Promise<any> {
    const charger = await this.dataSource
      .createQueryBuilder()
      .select('c.*')
      .from('chargers', 'c')
      .where('c.chargerId = :chargerId', { chargerId })
      .getRawOne();

    if (!charger) return null;

    const connector = await this.dataSource
      .createQueryBuilder()
      .select('cn.*')
      .from('connectors', 'cn')
      .where('cn.chargerId = :chargerRef AND cn.connectorId = :connectorId', { chargerRef: charger.id, connectorId })
      .getRawOne();

    const tariff = await this.dataSource
      .createQueryBuilder()
      .select('rt.*')
      .from('roamingtariffs', 'rt')
      .where('rt.chargerId = :chargerRef AND rt.emspId = :emspId', { chargerRef: charger.id, emspId })
      .getRawOne();

    return {
      ...charger,
      connectors: connector ? [connector] : [],
      roamingTariffs: tariff ? [tariff] : [],
    };
  }

  async findPrefixConfig(clientId: number) {
    return this.dataSource
      .createQueryBuilder()
      .select('pc.*')
      .from('prefixconfigs', 'pc')
      .where('pc.clientId = :clientId', { clientId })
      .getRawOne();
  }

  async createChargingSession(data: Record<string, unknown>) {
    return this.dataSource
      .createQueryBuilder()
      .insert()
      .into('chargingsessions')
      .values(data)
      .execute();
  }

  async findChargingSessionBySessionId(sessionId: string) {
    return this.dataSource
      .createQueryBuilder()
      .select('cs.*')
      .from('chargingsessions', 'cs')
      .where('cs.sessionId = :sessionId', { sessionId })
      .getRawOne();
  }

  async updateChargingSession(id: number, data: Record<string, unknown>) {
    return this.dataSource
      .createQueryBuilder()
      .update('chargingsessions')
      .set(data)
      .where('id = :id', { id })
      .execute();
  }

  async findDeviceTransactionById(id: number) {
    return this.dataSource
      .createQueryBuilder()
      .select('dt.*')
      .from('devicetransactions', 'dt')
      .where('dt.id = :id', { id })
      .getRawOne();
  }

  /** Mirrors legacy `CDRsModule.js:toOcpiCdr`'s `Charger.findOne({ where: { id: evse_uid }, include: [{ model: Connector, where: { connectorId } }] })`. */
  async findChargerForCdr(chargerNumericId: number, connectorIdStr: string): Promise<any> {
    const charger = await this.dataSource
      .createQueryBuilder()
      .select('c.*')
      .from('chargers', 'c')
      .where('c.id = :id', { id: chargerNumericId })
      .getRawOne();

    if (!charger) return null;

    const connector = await this.dataSource
      .createQueryBuilder()
      .select('cn.*')
      .from('connectors', 'cn')
      .where('cn.chargerId = :chargerRef AND cn.connectorId = :connectorId', {
        chargerRef: charger.id,
        connectorId: connectorIdStr,
      })
      .getRawOne();

    return { ...charger, connectors: connector ? [connector] : [] };
  }

  async findStationWithLocation(stationId: number): Promise<any> {
    const station = await this.dataSource
      .createQueryBuilder()
      .select('s.*')
      .from('stations', 's')
      .where('s.id = :id', { id: stationId })
      .getRawOne();

    if (!station) return null;

    const location = await this.dataSource
      .createQueryBuilder()
      .select('l.*')
      .from('locations', 'l')
      .where('l.stationId = :stationId', { stationId })
      .getRawOne();

    return { ...station, stationLocation: location ?? null };
  }

  async findRoamingTariffByChargerAndEmsp(chargerId: number, emspId: number) {
    return this.dataSource
      .createQueryBuilder()
      .select('rt.*')
      .from('roamingtariffs', 'rt')
      .where('rt.chargerId = :chargerId AND rt.emspId = :emspId', { chargerId, emspId })
      .getRawOne();
  }

  async createOcpiCdr(data: Partial<OcpiCdr>) {
    return this.ocpiCdrRepo.save(this.ocpiCdrRepo.create(data));
  }

  async updateOcpiCdr(id: number, data: Partial<OcpiCdr>) {
    await this.ocpiCdrRepo.update(id, data as any);
    return this.ocpiCdrRepo.findOne({ where: { id } });
  }
}
