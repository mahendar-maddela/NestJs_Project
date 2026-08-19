import { Injectable } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { OcpiEmsp } from '../entities/ocpi-emsp.entity';
import { OcpiVersion } from '../entities/ocpi-version.entity';
import { OcpiVersionEndpoint } from '../entities/ocpi-version-endpoint.entity';
import { OcpiPushedTariff } from '../entities/ocpi-pushed-tariff.entity';
import { OcpiPushStation } from '../entities/ocpi-push-station.entity';
import { OcpiCdr } from '../entities/ocpi-cdr.entity';
import { RoamingTariff } from '../entities/roaming-tariff.entity';

/** Admin management of eMSP partners connected to our CPO. Mirrors legacy `admin/ocpi/*` controllers. */
@Injectable()
export class AdminEmspRepository {
  constructor(
    @InjectRepository(OcpiEmsp)
    private readonly ocpiEmspRepo: Repository<OcpiEmsp>,
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
    @InjectRepository(RoamingTariff)
    private readonly roamingTariffRepo: Repository<RoamingTariff>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async findMany(clientId: number, search: string | undefined, skip: number, take: number) {
    const qb = this.ocpiEmspRepo
      .createQueryBuilder('e')
      .where('e.clientId = :clientId', { clientId })
      .orderBy('e.id', 'DESC')
      .skip(skip)
      .take(take);

    if (search) {
      qb.andWhere(
        '(e.business_name LIKE :s OR e.business_website LIKE :s OR e.party_id LIKE :s)',
        { s: `%${search}%` },
      );
    }

    const [rows, count] = await qb.getManyAndCount();
    return { rows, count };
  }

  async findById(id: number, clientId: number) {
    return this.ocpiEmspRepo.findOne({ where: { id, clientId } });
  }

  async create(data: Partial<OcpiEmsp>) {
    return this.ocpiEmspRepo.save(this.ocpiEmspRepo.create(data));
  }

  async update(id: number, data: Partial<OcpiEmsp>) {
    await this.ocpiEmspRepo.update(id, data as any);
    return this.ocpiEmspRepo.findOne({ where: { id } });
  }

  async findVersion(emspId: number, version: string) {
    return this.ocpiVersionRepo.findOne({ where: { emspId, version } });
  }

  async upsertVersion(emspId: number, version: string, url: string) {
    const existing = await this.findVersion(emspId, version);
    if (existing) {
      await this.ocpiVersionRepo.update(existing.id, { version_url: url });
      return this.ocpiVersionRepo.findOne({ where: { id: existing.id } });
    }
    return this.ocpiVersionRepo.save(this.ocpiVersionRepo.create({ emspId, version, version_url: url }));
  }

  async replaceVersionEndpoints(
    versionId: number,
    endpoints: { identifier: string; role: string; url: string }[],
  ) {
    await this.ocpiVersionEndpointRepo.delete({ versionId });
    if (endpoints.length > 0) {
      const entities = endpoints.map((e) =>
        this.ocpiVersionEndpointRepo.create({ versionId, ...e }),
      );
      await this.ocpiVersionEndpointRepo.save(entities);
    }
  }

  async findVersionEndpoint(versionId: number, identifier: string, role: string) {
    return this.ocpiVersionEndpointRepo.findOne({ where: { versionId, identifier, role } });
  }

  async findCharger(id: number, clientId: number) {
    return this.dataSource
      .createQueryBuilder()
      .select('c.*')
      .from('chargers', 'c')
      .where('c.id = :id AND c.clientId = :clientId', { id, clientId })
      .getRawOne();
  }

  async findTariff(chargerId: number, clientId: number) {
    return this.dataSource
      .createQueryBuilder()
      .select('t.*')
      .from('tariffs', 't')
      .where('t.chargerId = :chargerId AND t.userTypeId IS NULL AND t.clientId = :clientId', {
        chargerId,
        clientId,
      })
      .getRawOne();
  }

  async findRoamingTariff(where: {
    id?: number;
    chargerId?: number;
    clientId: number;
    emspId: number;
  }) {
    return this.roamingTariffRepo.findOne({ where: where as any });
  }

  async createRoamingTariff(data: Partial<RoamingTariff>) {
    return this.roamingTariffRepo.save(this.roamingTariffRepo.create(data));
  }

  async updateRoamingTariff(id: number, data: Partial<RoamingTariff>) {
    await this.roamingTariffRepo.update(id, data as any);
    return this.roamingTariffRepo.findOne({ where: { id } });
  }

  async findPushedTariffs(emspId: number, skip: number, take: number) {
    const [rows, count] = await this.ocpiPushedTariffRepo.findAndCount({
      where: { emspId },
      order: { id: 'DESC' },
      skip,
      take,
      relations: { roamingTariff: { charger: { vendor: true, station: true } } },
    });
    return { rows, count };
  }

  async findPushedTariff(emspId: number, roamingTariffId: number) {
    return this.ocpiPushedTariffRepo.findOne({ where: { emspId, roamingTariffId } });
  }

  async createPushedTariff(data: Partial<OcpiPushedTariff>) {
    return this.ocpiPushedTariffRepo.save(this.ocpiPushedTariffRepo.create(data));
  }

  async deletePushedTariff(emspId: number, roamingTariffId: number) {
    return this.ocpiPushedTariffRepo.delete({ emspId, roamingTariffId });
  }

  async findSessions(
    emspId: number,
    filters: { chargerRef?: number; vendorId?: number; stationId?: number; skip: number; take: number },
  ) {
    const qb = this.dataSource
      .createQueryBuilder()
      .select('dt.*')
      .from('devicetransactions', 'dt')
      .where('dt.emspId = :emspId', { emspId })
      .orderBy('dt.id', 'DESC')
      .skip(filters.skip)
      .take(filters.take);

    if (filters.chargerRef) qb.andWhere('dt.chargerRef = :chargerRef', { chargerRef: filters.chargerRef });

    const rows = await qb.getRawMany();
    const countResult = await this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'cnt')
      .from('devicetransactions', 'dt')
      .where('dt.emspId = :emspId', { emspId })
      .getRawOne<{ cnt: string }>();

    return { rows, count: Number(countResult?.cnt ?? 0) };
  }

  async findSessionsForDownload(filters: {
    emspId: number;
    chargerIds?: number[];
    vendorIds?: number[];
    stationIds?: number[];
    startDate?: Date;
    endDate?: Date;
  }) {
    const qb = this.dataSource
      .createQueryBuilder()
      .select('dt.*')
      .from('devicetransactions', 'dt')
      .where('dt.emspId = :emspId', { emspId: filters.emspId })
      .orderBy('dt.createdAt', 'DESC');

    if (filters.chargerIds?.length)
      qb.andWhere('dt.chargerRef IN (:...chargerIds)', { chargerIds: filters.chargerIds });
    if (filters.startDate) qb.andWhere('dt.createdAt >= :startDate', { startDate: filters.startDate });
    if (filters.endDate) qb.andWhere('dt.createdAt <= :endDate', { endDate: filters.endDate });

    return qb.getRawMany();
  }

  async findCdrs(emspId: number, skip: number, take: number) {
    const [rows, count] = await this.ocpiCdrRepo.findAndCount({
      where: { emspId },
      order: { id: 'DESC' },
      skip,
      take,
      relations: { token: true },
    });
    return { rows, count };
  }

  async findCdrBySession(emspId: number, sessionId: string) {
    return this.ocpiCdrRepo.findOne({ where: { emspId, session_id: sessionId } });
  }

  async findRevenueTransactions(
    emspId: number,
    filters: { chargerRef?: number; vendorId?: number; stationId?: number; from: Date; to: Date },
  ) {
    const qb = this.dataSource
      .createQueryBuilder()
      .select(['dt.price', 'dt.totalWh', 'dt.createdAt'])
      .from('devicetransactions', 'dt')
      .where('dt.emspId = :emspId AND dt.createdAt >= :from AND dt.createdAt <= :to', {
        emspId,
        from: filters.from,
        to: filters.to,
      });

    if (filters.chargerRef) qb.andWhere('dt.chargerRef = :chargerRef', { chargerRef: filters.chargerRef });

    return qb.getRawMany();
  }

  async findPushedStations(emspId: number, skip: number, take: number) {
    const [rows, count] = await this.ocpiPushStationRepo.findAndCount({
      where: { emspId },
      order: { createdAt: 'DESC' },
      skip,
      take,
      relations: { charger: true, station: true },
    });
    return { rows, count };
  }

  async findPushedStation(emspId: number, chargerId: number) {
    return this.ocpiPushStationRepo.findOne({ where: { emspId, chargerId } });
  }

  async findOrCreatePushedStation(data: Partial<OcpiPushStation>) {
    const existing = await this.ocpiPushStationRepo.findOne({
      where: { chargerId: data.chargerId, stationId: data.stationId, emspId: data.emspId } as any,
    });
    if (existing) return existing;
    return this.ocpiPushStationRepo.save(this.ocpiPushStationRepo.create(data));
  }

  async deletePushedStation(id: number) {
    return this.ocpiPushStationRepo.delete(id);
  }

  async findStationWithChargers(stationId: number, chargerIds: number[], emspId: number) {
    return this.dataSource
      .createQueryBuilder()
      .select('s.*')
      .from('stations', 's')
      .where('s.id = :stationId', { stationId })
      .getRawOne();
  }

  async findStationForRemoval(stationId: number, chargerId: number) {
    return this.dataSource
      .createQueryBuilder()
      .select('s.*')
      .from('stations', 's')
      .where('s.id = :stationId', { stationId })
      .getRawOne();
  }

  async findClientDetails(clientId: number) {
    return this.dataSource
      .createQueryBuilder()
      .select('cd.*')
      .from('clientdetails', 'cd')
      .where('cd.clientId = :clientId', { clientId })
      .getRawOne();
  }
}
