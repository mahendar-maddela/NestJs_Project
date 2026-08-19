import { Injectable } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { OcpiCpo } from '../entities/ocpi-cpo.entity';
import { OcpiCpoVersion } from '../entities/ocpi-cpo-version.entity';
import { OcpiCpoVersionEndpoint } from '../entities/ocpi-cpo-version-endpoint.entity';
import { OcpiCpoLocation } from '../entities/ocpi-cpo-location.entity';
import { OcpiCpoEvse } from '../entities/ocpi-cpo-evse.entity';
import { OcpiCpoConnector } from '../entities/ocpi-cpo-connector.entity';
import { OcpiCpoTariff } from '../entities/ocpi-cpo-tariff.entity';
import { OcpiCpoSession } from '../entities/ocpi-cpo-session.entity';
import { OcpiCpoTransaction } from '../entities/ocpi-cpo-transaction.entity';
import { OcpiCpoCdr } from '../entities/ocpi-cpo-cdr.entity';
import { User } from '../../../users/src/entities/user.entity';
import { Wallet } from '../../../wallet/src/entities/wallet.entity';
import { WalletTransaction } from '../../../wallet/src/entities/wallet-transaction.entity';
import { DeviceTransaction } from '../../../sessions/src/entities/device-transaction.entity';

@Injectable()
export class OcpiCpoPartnerRepository {
  constructor(
    @InjectRepository(OcpiCpo)
    private readonly ocpiCpoRepo: Repository<OcpiCpo>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private readonly walletTransactionRepo: Repository<WalletTransaction>,
    @InjectRepository(DeviceTransaction)
    private readonly deviceTransactionRepo: Repository<DeviceTransaction>,
    @InjectRepository(OcpiCpoVersion)
    private readonly ocpiCpoVersionRepo: Repository<OcpiCpoVersion>,
    @InjectRepository(OcpiCpoVersionEndpoint)
    private readonly ocpiCpoVersionEndpointRepo: Repository<OcpiCpoVersionEndpoint>,
    @InjectRepository(OcpiCpoLocation)
    private readonly ocpiCpoLocationRepo: Repository<OcpiCpoLocation>,
    @InjectRepository(OcpiCpoEvse)
    private readonly ocpiCpoEvseRepo: Repository<OcpiCpoEvse>,
    @InjectRepository(OcpiCpoConnector)
    private readonly ocpiCpoConnectorRepo: Repository<OcpiCpoConnector>,
    @InjectRepository(OcpiCpoTariff)
    private readonly ocpiCpoTariffRepo: Repository<OcpiCpoTariff>,
    @InjectRepository(OcpiCpoSession)
    private readonly ocpiCpoSessionRepo: Repository<OcpiCpoSession>,
    @InjectRepository(OcpiCpoTransaction)
    private readonly ocpiCpoTransactionRepo: Repository<OcpiCpoTransaction>,
    @InjectRepository(OcpiCpoCdr)
    private readonly ocpiCpoCdrRepo: Repository<OcpiCpoCdr>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  // ---- CPO ----

  async findCpoById(id: number) {
    return this.ocpiCpoRepo.findOne({ where: { id } });
  }

  async findCpoByIdAndClient(id: number, clientId: number) {
    return this.ocpiCpoRepo.findOne({ where: { id, clientId } });
  }

  // ---- App (EMSP user) session command helpers ----

  /** Mirrors `controllers/APP/OCPI/commandController.js:ocpiStartSession`. */
  findUserById(userId: number) {
    return this.userRepo.findOne({ where: { id: userId }, select: { id: true, userId: true } });
  }

  findUserWallet(userId: number) {
    return this.walletRepo.findOne({ where: { userId, type: 'User' } });
  }

  findRunningDeviceTransactionAmountsByUser(userId: number) {
    return this.deviceTransactionRepo.find({ where: { userId, status: 0 }, select: { id: true, maxAmount: true } });
  }

  findPendingCpoSessionAmountsByUser(userId: number) {
    return this.ocpiCpoSessionRepo.find({ where: { user_id: userId, status: 'PENDING' }, select: { id: true, max_amount: true } });
  }

  async findCpoByPartyAndCountry(party_id: string, country_code: string, clientId?: number) {
    const where: any = { party_id, country_code };
    if (clientId) where.clientId = clientId;
    return this.ocpiCpoRepo.findOne({ where });
  }

  async findCpoByTokenA(token_a: string) {
    return this.ocpiCpoRepo.findOne({ where: { token_a } });
  }

  async findManyCpos(clientId: number, filters: { search?: string; status?: string; skip: number; take: number }) {
    const qb = this.ocpiCpoRepo
      .createQueryBuilder('cpo')
      .where('cpo.clientId = :clientId', { clientId })
      .orderBy('cpo.id', 'DESC')
      .skip(filters.skip)
      .take(filters.take);

    if (filters.status) {
      qb.andWhere('cpo.status = :status', { status: filters.status });
    }

    if (filters.search) {
      qb.andWhere(
        '(cpo.business_name LIKE :search OR cpo.business_website LIKE :search OR cpo.party_id LIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    const [rows, count] = await qb.getManyAndCount();
    return { rows, count };
  }

  async createCpo(data: Partial<OcpiCpo>) {
    return this.ocpiCpoRepo.save(this.ocpiCpoRepo.create(data));
  }

  async updateCpo(id: number, data: Partial<OcpiCpo>) {
    await this.ocpiCpoRepo.update(id, data as any);
    return this.ocpiCpoRepo.findOne({ where: { id } });
  }

  // ---- Versions ----

  async findVersion(cpoId: number, version: string) {
    return this.ocpiCpoVersionRepo.findOne({ where: { cpoId, version } });
  }

  async upsertVersion(cpoId: number, version: string, url: string) {
    const existing = await this.findVersion(cpoId, version);
    if (existing) {
      await this.ocpiCpoVersionRepo.update(existing.id, { url });
      return this.ocpiCpoVersionRepo.findOne({ where: { id: existing.id } });
    }
    return this.ocpiCpoVersionRepo.save(this.ocpiCpoVersionRepo.create({ cpoId, version, url }));
  }

  async findVersionEndpoint(versionId: number, identifier: string, role: string) {
    return this.ocpiCpoVersionEndpointRepo.findOne({ where: { versionId, identifier, role } });
  }

  async replaceVersionEndpoints(versionId: number, endpoints: { identifier: string; role: string; url: string }[]) {
    await this.ocpiCpoVersionEndpointRepo.delete({ versionId });
    if (endpoints.length > 0) {
      const entities = endpoints.map((e) =>
        this.ocpiCpoVersionEndpointRepo.create({ versionId, identifier: e.identifier, role: e.role, url: e.url }),
      );
      await this.ocpiCpoVersionEndpointRepo.save(entities);
    }
  }

  // ---- Locations / EVSEs / Connectors ----

  async findLocationByOcpiId(cpoId: number, locationId: string) {
    return this.ocpiCpoLocationRepo.findOne({
      where: { cpoId, locationId },
      relations: { evses: { connectors: true } },
    });
  }

  async upsertLocation(cpoId: number, locationId: string, data: Omit<Partial<OcpiCpoLocation>, 'cpoId' | 'locationId'>) {
    const existing = await this.ocpiCpoLocationRepo.findOne({ where: { cpoId, locationId } });
    if (existing) {
      await this.ocpiCpoLocationRepo.update(existing.id, data as any);
      return this.ocpiCpoLocationRepo.findOne({ where: { id: existing.id } });
    }
    return this.ocpiCpoLocationRepo.save(this.ocpiCpoLocationRepo.create({ cpoId, locationId, ...data }));
  }

  async patchLocation(cpoId: number, locationId: string, data: Partial<OcpiCpoLocation>) {
    return this.ocpiCpoLocationRepo.update({ cpoId, locationId }, data as any);
  }

  async findLocationRowForPatch(cpoId: number, locationId: string) {
    return this.ocpiCpoLocationRepo.findOne({ where: { cpoId, locationId } });
  }

  async upsertEvse(locationId: number, uid: string, data: Omit<Partial<OcpiCpoEvse>, 'locationId' | 'uid'>) {
    const existing = await this.ocpiCpoEvseRepo.findOne({ where: { locationId, uid } });
    if (existing) {
      await this.ocpiCpoEvseRepo.update(existing.id, data as any);
      return this.ocpiCpoEvseRepo.findOne({ where: { id: existing.id } });
    }
    return this.ocpiCpoEvseRepo.save(this.ocpiCpoEvseRepo.create({ locationId, uid, ...data }));
  }

  async findEvseByUid(locationId: number, uid: string) {
    return this.ocpiCpoEvseRepo.findOne({ where: { locationId, uid } });
  }

  async updateEvse(id: number, data: Partial<OcpiCpoEvse>) {
    await this.ocpiCpoEvseRepo.update(id, data as any);
    return this.ocpiCpoEvseRepo.findOne({ where: { id } });
  }

  async upsertConnector(evseId: number, connectorId: string, data: Omit<Partial<OcpiCpoConnector>, 'evseId' | 'connector_id'>) {
    const existing = await this.ocpiCpoConnectorRepo.findOne({ where: { evseId, connector_id: connectorId } });
    if (existing) {
      await this.ocpiCpoConnectorRepo.update(existing.id, data as any);
      return this.ocpiCpoConnectorRepo.findOne({ where: { id: existing.id } });
    }
    return this.ocpiCpoConnectorRepo.save(this.ocpiCpoConnectorRepo.create({ evseId, connector_id: connectorId, ...data }));
  }

  async findConnector(evseId: number, connectorId: string) {
    return this.ocpiCpoConnectorRepo.findOne({ where: { evseId, connector_id: connectorId } });
  }

  async updateConnector(id: number, data: Partial<OcpiCpoConnector>) {
    await this.ocpiCpoConnectorRepo.update(id, data as any);
    return this.ocpiCpoConnectorRepo.findOne({ where: { id } });
  }

  async findLocationsByCpoId(cpoId: number, filters: { search?: string; skip: number; take: number }) {
    const qb = this.ocpiCpoLocationRepo
      .createQueryBuilder('loc')
      .leftJoinAndSelect('loc.evses', 'evse')
      .where('loc.cpoId = :cpoId', { cpoId })
      .orderBy('loc.id', 'DESC')
      .skip(filters.skip)
      .take(filters.take);

    if (filters.search) {
      qb.andWhere(
        '(loc.party_id LIKE :search OR loc.country_code LIKE :search OR loc.name LIKE :search OR loc.address LIKE :search OR loc.city LIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    const [rows, count] = await qb.getManyAndCount();
    return { rows, count };
  }

  async findLocationById(cpoId: number, id: number) {
    return this.ocpiCpoLocationRepo.findOne({
      where: { cpoId, id },
      relations: { evses: { connectors: true } },
    });
  }

  /** Mirrors `controllers/APP/OCPI/locationController.js:getOcpiLocationById` — no cpoId scope. */
  async findLocationByIdGlobal(id: number) {
    return this.ocpiCpoLocationRepo.findOne({
      where: { id },
      relations: { evses: { connectors: true }, cpo: true },
    });
  }

  /** Mirrors `controllers/APP/OCPI/locationController.js` / `sessionController.js` tariff mapping. */
  async findTariffsByIdsAndParty(tariffIds: string[], partyId?: string) {
    if (!tariffIds.length) return [];
    const qb = this.ocpiCpoTariffRepo.createQueryBuilder('t').where('t.tariff_id IN (:...tariffIds)', { tariffIds });
    if (partyId) qb.andWhere('t.party_id = :partyId', { partyId });
    return qb.getMany();
  }

  async findEvseById(id: number) {
    return this.ocpiCpoEvseRepo.findOne({
      where: { id },
      relations: { connectors: true },
    });
  }

  async findEvseByUidGlobal(uid: string) {
    return this.ocpiCpoEvseRepo.findOne({
      where: { uid },
      relations: { connectors: true, location: true },
    });
  }

  // ---- Tariffs ----

  async findTariff(cpoId: number, country_code: string, party_id: string, tariffId: string) {
    return this.ocpiCpoTariffRepo.findOne({ where: { cpoId, country_code, party_id, tariff_id: tariffId } });
  }

  async upsertTariff(
    cpoId: number,
    country_code: string,
    party_id: string,
    tariffId: string,
    data: Omit<Partial<OcpiCpoTariff>, 'cpoId' | 'country_code' | 'party_id' | 'tariff_id'>,
  ) {
    const existing = await this.ocpiCpoTariffRepo.findOne({ where: { country_code, party_id, tariff_id: tariffId } });
    if (existing) {
      await this.ocpiCpoTariffRepo.update(existing.id, data as any);
      return this.ocpiCpoTariffRepo.findOne({ where: { id: existing.id } });
    }
    return this.ocpiCpoTariffRepo.save(
      this.ocpiCpoTariffRepo.create({ cpoId, country_code, party_id, tariff_id: tariffId, ...data }),
    );
  }

  async deleteTariff(cpoId: number, country_code: string, party_id: string, tariffId: string) {
    return this.ocpiCpoTariffRepo.delete({ cpoId, country_code, party_id, tariff_id: tariffId });
  }

  async findTariffsByCpoId(cpoId: number, filters: { search?: string; skip: number; take: number }) {
    const qb = this.ocpiCpoTariffRepo
      .createQueryBuilder('t')
      .where('t.cpoId = :cpoId', { cpoId })
      .orderBy('t.id', 'DESC')
      .skip(filters.skip)
      .take(filters.take);

    if (filters.search) {
      qb.andWhere('(t.tariff_id LIKE :search OR t.party_id LIKE :search)', { search: `%${filters.search}%` });
    }

    const [rows, count] = await qb.getManyAndCount();
    return { rows, count };
  }

  async findTariffByIdsAndParty(tariffIds: string[], partyId?: string) {
    const qb = this.ocpiCpoTariffRepo.createQueryBuilder('t');
    if (tariffIds.length > 0) {
      qb.where('t.tariff_id IN (:...tariffIds)', { tariffIds });
    } else {
      qb.where('t.tariff_id = :none', { none: '__none__' });
    }
    if (partyId) {
      qb.andWhere('t.party_id = :partyId', { partyId });
    }
    return qb.getRawOne();
  }

  // ---- OcpiCpoSession ----

  async findActiveSessionByEvse(evseUid: string) {
    return this.ocpiCpoSessionRepo
      .createQueryBuilder('s')
      .where('s.evse_uid = :evseUid AND s.status IN (:...statuses)', {
        evseUid,
        statuses: ['PENDING', 'ACTIVE'],
      })
      .getRawOne();
  }

  async createCpoSession(data: Partial<OcpiCpoSession>) {
    return this.ocpiCpoSessionRepo.save(this.ocpiCpoSessionRepo.create(data));
  }

  async findCpoSessionBySessionId(sessionId: string) {
    return this.ocpiCpoSessionRepo.findOne({ where: { sessionId } });
  }

  async updateCpoSession(id: number, data: Partial<OcpiCpoSession>) {
    await this.ocpiCpoSessionRepo.update(id, data as any);
    return this.ocpiCpoSessionRepo.findOne({ where: { id } });
  }

  /** Mirrors `cdrHandler.js:createCdr`'s wallet settlement — debits the roamed session's user for the final CDR amount. */
  async debitUserWalletForCpoSession(userId: number, clientId: number, amount: number, refNo: string) {
    const user = await this.userRepo.findOne({ where: { id: userId, clientId } });
    if (!user) return;

    const wallet = await this.walletRepo.findOne({ where: { userId: user.id, type: 'User' } });
    if (!wallet) return;

    const remainingBalance = (wallet.balance || 0) - amount;

    await this.walletTransactionRepo.save(
      this.walletTransactionRepo.create({
        type: 'Debit',
        walletId: wallet.id,
        amount,
        remainingBalance,
        refNo,
        note: 'Charging Stopped',
        transactionPurpose: 'Charging',
        sourceType: 'Wallet',
        clientId,
        userType: 'User',
      }),
    );

    await this.walletRepo.update(wallet.id, { balance: remainingBalance });
  }

  async findCpoSessionsByEvseId(evseId: number, skip: number, take: number) {
    const [rows, count] = await this.ocpiCpoSessionRepo.findAndCount({
      where: { evse_id: evseId },
      order: { id: 'DESC' },
      skip,
      take,
    });
    return { rows, count };
  }

  // ---- OcpiCpoTransaction ----

  async findTransaction(cpoId: number, country_code: string, party_id: string, sessionId: string) {
    return this.ocpiCpoTransactionRepo.findOne({
      where: { cpo_id: cpoId, country_code, party_id, session_id: sessionId },
    });
  }

  /** Mirrors `controllers/APP/OCPI/sessionController.js:getOcpiRunningSessionBySessionId`. */
  findTransactionByAuthRefAndUser(authorizationReference: string, userId: number) {
    return this.ocpiCpoTransactionRepo.findOne({
      where: { authorization_reference: authorizationReference, user_id: userId },
      relations: { session: true },
    });
  }

  /** Mirrors `controllers/APP/OCPI/sessionController.js:getOcpiInvoice`/`getOcpiInvoiceSummary`. */
  findTransactionByIdAndUser(id: number, userId: number) {
    return this.ocpiCpoTransactionRepo.findOne({ where: { id, user_id: userId } });
  }

  /** Mirrors `controllers/APP/OCPI/sessionController.js:getOcpiInvoice`'s `User` include. */
  findTransactionByIdAndUserWithUser(id: number, userId: number) {
    return this.ocpiCpoTransactionRepo.findOne({ where: { id, user_id: userId }, relations: { user: true } });
  }

  findConnectorByConnectorIdAndEvse(connectorId: string, evseId: number) {
    return this.ocpiCpoConnectorRepo.findOne({ where: { connector_id: connectorId, evseId } });
  }

  findTariffByPartyCpoTariffId(partyId: string, cpoId: number, tariffId: string) {
    return this.ocpiCpoTariffRepo.findOne({ where: { party_id: partyId, cpoId, tariff_id: tariffId } });
  }

  async findTransactionBySessionId(sessionId: string) {
    return this.ocpiCpoTransactionRepo.findOne({ where: { session_id: sessionId } });
  }

  async createTransaction(data: Partial<OcpiCpoTransaction>) {
    return this.ocpiCpoTransactionRepo.save(this.ocpiCpoTransactionRepo.create(data));
  }

  async updateTransaction(id: number, data: Partial<OcpiCpoTransaction>) {
    await this.ocpiCpoTransactionRepo.update(id, data as any);
    return this.ocpiCpoTransactionRepo.findOne({ where: { id } });
  }

  async findTransactionsByCpoId(cpoId: number, filters: { search?: string; skip: number; take: number }) {
    const qb = this.ocpiCpoTransactionRepo
      .createQueryBuilder('tx')
      .where('tx.cpo_id = :cpoId', { cpoId })
      .orderBy('tx.id', 'DESC')
      .skip(filters.skip)
      .take(filters.take);

    if (filters.search) {
      qb.andWhere(
        '(tx.session_id LIKE :search OR tx.party_id LIKE :search OR tx.country_code LIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    const [rows, count] = await qb.getManyAndCount();
    return { rows, count };
  }

  async findTransactionsByEvseId(evseId: number, filters: { search?: string; skip: number; take: number }) {
    const qb = this.ocpiCpoTransactionRepo
      .createQueryBuilder('tx')
      .where('tx.evse_id = :evseId', { evseId })
      .orderBy('tx.id', 'DESC')
      .skip(filters.skip)
      .take(filters.take);

    if (filters.search) {
      qb.andWhere(
        '(tx.session_id LIKE :search OR tx.party_id LIKE :search OR tx.country_code LIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    const [rows, count] = await qb.getManyAndCount();
    return { rows, count };
  }

  async findTransactionsForDownload(cpoId: number, from?: Date, to?: Date) {
    const qb = this.ocpiCpoTransactionRepo
      .createQueryBuilder('tx')
      .leftJoinAndSelect('tx.user', 'user')
      .where('tx.cpo_id = :cpoId', { cpoId })
      .orderBy('tx.id', 'DESC');

    if (from) qb.andWhere('tx.createdAt >= :from', { from });
    if (to) qb.andWhere('tx.createdAt <= :to', { to });

    return qb.getMany();
  }

  async sumTransactionField(cpoId: number, field: 'total_price' | 'kwh', where: Record<string, unknown> = {}) {
    const qb = this.ocpiCpoTransactionRepo
      .createQueryBuilder('tx')
      .select(`SUM(tx.${field})`, 'sum')
      .where('tx.cpo_id = :cpoId', { cpoId });

    if (Object.keys(where).length > 0) {
      qb.andWhere(where);
    }

    const res = await qb.getRawOne();
    return Number((res as any)?.sum ?? 0);
  }

  async countTransactions(cpoId: number, where: Record<string, unknown> = {}) {
    const qb = this.ocpiCpoTransactionRepo
      .createQueryBuilder('tx')
      .where('tx.cpo_id = :cpoId', { cpoId });

    if (Object.keys(where).length > 0) {
      qb.andWhere(where);
    }

    return qb.getCount();
  }

  // ---- CDRs ----

  async findCdrByCdrId(cdrId: string) {
    return this.ocpiCpoCdrRepo.findOne({
      where: { cdr_id: cdrId },
      relations: { cpo: true },
    });
  }

  async findCdrByCdrIdCountryParty(cdrId: string, countryCode: string, partyId: string, cpoId: number) {
    return this.ocpiCpoCdrRepo.findOne({
      where: { cdr_id: cdrId, country_code: countryCode, party_id: partyId, cpo_id: cpoId },
    });
  }

  async findCdrByIdAndCpo(cpoId: number, id: number) {
    return this.ocpiCpoCdrRepo.findOne({ where: { cpo_id: cpoId, id } });
  }

  async createCdr(data: Partial<OcpiCpoCdr>) {
    return this.ocpiCpoCdrRepo.save(this.ocpiCpoCdrRepo.create(data));
  }

  async findCdrsByCpoId(cpoId: number, filters: { search?: string; skip: number; take: number }) {
    const qb = this.ocpiCpoCdrRepo
      .createQueryBuilder('cdr')
      .where('cdr.cpo_id = :cpoId', { cpoId })
      .orderBy('cdr.id', 'DESC')
      .skip(filters.skip)
      .take(filters.take);

    if (filters.search) {
      qb.andWhere('cdr.cdr_id LIKE :search', { search: `%${filters.search}%` });
    }

    const [rows, count] = await qb.getManyAndCount();
    return { rows, count };
  }

  async findCdrsForDownload(cpoId: number, from?: Date, to?: Date) {
    const qb = this.ocpiCpoCdrRepo
      .createQueryBuilder('cdr')
      .where('cdr.cpo_id = :cpoId', { cpoId })
      .orderBy('cdr.id', 'DESC');

    if (from) qb.andWhere('cdr.createdAt >= :from', { from });
    if (to) qb.andWhere('cdr.createdAt <= :to', { to });

    return qb.getMany();
  }

  // ---- Wallet / User ----

  async findUserByUserId(userId: string, clientId: number) {
    return this.dataSource
      .createQueryBuilder()
      .select('u.*')
      .from('users', 'u')
      .where('u.userId = :userId AND u.clientId = :clientId', { userId, clientId })
      .getRawOne();
  }

  async findWallet(userId: number) {
    return this.dataSource
      .createQueryBuilder()
      .select('w.*')
      .from('wallets', 'w')
      .where('w.userId = :userId AND w.type = :type', { userId, type: 'User' })
      .getRawOne();
  }

  async sumRunningDeviceTransactionMaxAmount(userId: string) {
    const qb = this.dataSource
      .createQueryBuilder()
      .select('SUM(dt.maxAmount)', 'sum')
      .from('devicetransactions', 'dt')
      .where('dt.status = 0');

    const numUserId = Number(userId);
    if (numUserId) {
      qb.andWhere('dt.userId = :numUserId', { numUserId });
    }

    const res = await qb.getRawOne();
    return Number(res?.sum ?? 0);
  }

  async sumPendingCpoSessionMaxAmount(userId: number) {
    const res = await this.ocpiCpoSessionRepo
      .createQueryBuilder('s')
      .select('SUM(s.max_amount)', 'sum')
      .where('s.user_id = :userId AND s.status = :status', { userId, status: 'PENDING' })
      .getRawOne();
    return Number((res as any)?.sum ?? 0);
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
