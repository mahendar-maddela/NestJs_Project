import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { OcpiCpoPartnerRepository } from '../repositories/ocpi-cpo-partner.repository';
import { getMethodOcpi, postMethodOcpi } from '../utils/ocpi-http.util';
import { encodeBase64, parsePage } from '../utils/ocpi-response.util';
import { OCPI_CONFIG, OCPI_CURR_VERSION, OCPI_IDENTIFIERS, OCPI_ROLES, OCPI_SERVER } from '../constants/ocpi.constants';
import { CreateOcpiCpoDto, RemoteStartSessionDto, RemoteStopSessionDto, CancelSessionDto, UpdateOcpiCpoDto } from '../dto/admin-cpo.dto';

/**
 * Admin management of roaming CPO partners we connect to as eMSP.
 * Mirrors legacy `src/controllers/admin/ocpi/cpo/*`.
 */
@Injectable()
export class AdminCpoService {
  constructor(private readonly repo: OcpiCpoPartnerRepository) {}

  // ---- CRUD ----

  async createCpo(clientId: number, dto: CreateOcpiCpoDto) {
    const existing = await this.repo.findCpoByPartyAndCountry(dto.party_id, dto.country_code, clientId);
    if (existing) throw new BadRequestException('cpo already exists for this party_id and country_code');

    const cpo = await this.repo.createCpo({
      party_id: dto.party_id,
      country_code: dto.country_code,
      business_name: dto.business_name,
      url: dto.url,
      token_a: uuidv4(),
      token_b: dto.token_b,
      clientId,
    });

    return { token_a: cpo.token_a, cpo };
  }

  async getAllCpos(clientId: number, query: any) {
    const { page, limit, skip, take } = parsePage(query);
    const { rows, count } = await this.repo.findManyCpos(clientId, { search: query.search, status: query.status, skip, take });
    return { data: rows, pagination: { totalPages: Math.ceil(count / limit), page, totalCount: count } };
  }

  async getCpoById(clientId: number, id: number) {
    const cpo = await this.repo.findCpoByIdAndClient(id, clientId);
    if (!cpo) throw new NotFoundException('OCPI CPO not found');
    return cpo;
  }

  async updateCpo(clientId: number, id: number, dto: UpdateOcpiCpoDto) {
    const cpo = await this.repo.findCpoByIdAndClient(id, clientId);
    if (!cpo) throw new NotFoundException('OCPI CPO not found');

    return this.repo.updateCpo(id, {
      ...(dto.business_name && { business_name: dto.business_name }),
      ...(dto.url && { url: dto.url }),
      ...(dto.token_b && { token_b: dto.token_b }),
      ...(dto.status && { status: dto.status as any }),
      ...(dto.party_id && { party_id: dto.party_id }),
    });
  }

  // ---- Handshake / versions ----

  /** Mirrors `HandshakeHandler.js:cpoInitiateHandShakeRequest`. */
  async handshake(clientId: number, cpoId: number) {
    const cpo = await this.repo.findCpoByIdAndClient(cpoId, clientId);
    if (!cpo) throw new NotFoundException('CPO not found');
    if (!cpo.token_b) throw new BadRequestException('Token b not found');

    const clientDetails = await this.repo.findClientDetails(clientId);

    const data = {
      token: cpo.token_a,
      url: `${OCPI_SERVER}/v1/ocpi/emsp/versions`,
      roles: [
        {
          role: 'CPO',
          party_id: clientDetails?.partyId,
          country_code: OCPI_CONFIG.country_code,
          business_details: {
            name: clientDetails?.brandName,
            website: clientDetails?.businessUrl,
            logo: {
              url: clientDetails?.logoUrl,
              thumbnail: clientDetails?.logoUrl,
              category: 'OPERATOR',
              type: 'jpeg',
              width: 512,
              height: 512,
            },
          },
        },
      ],
    };

    const version = await this.repo.findVersion(cpo.id, OCPI_CURR_VERSION);
    if (!version) throw new NotFoundException('Cpo Version not stored');

    const endpoint = await this.repo.findVersionEndpoint(version.id, OCPI_IDENTIFIERS.credentials, OCPI_ROLES.receiver);
    if (!endpoint?.url) throw new NotFoundException('Version endpoint not found');

    const tokenB = encodeBase64(cpo.token_b);
    const credentialsResponse = await postMethodOcpi(endpoint.url, data, tokenB);
    const credRes = credentialsResponse.data?.data;
    const role = credRes?.roles?.[0];
    const businessDetails = role?.business_details;

    await this.repo.updateCpo(cpo.id, {
      token_b: credRes?.token,
      url: credRes?.url,
      role: role?.role || 'CPO',
      party_id: role?.party_id,
      country_code: role?.country_code || 'IN',
      business_name: businessDetails?.name || null,
      business_website: businessDetails?.website || null,
      business_logo: businessDetails?.logo?.url || null,
      status: 'CONNECTED',
    });

    return credentialsResponse.data;
  }

  /** Mirrors `versionHandler.js:handleCpoVersionsRequest`. */
  async sendVersionsRequest(clientId: number, cpoId: number) {
    const cpo = await this.repo.findCpoByIdAndClient(cpoId, clientId);
    if (!cpo) throw new NotFoundException('CPO not found');
    if (!cpo.url) throw new NotFoundException('Versions endpoint not found');
    if (!cpo.token_b) throw new BadRequestException('Token b not found');

    const tokenB = encodeBase64(cpo.token_b);
    const versionsResponse = await getMethodOcpi<{ data: { version: string; url: string }[] }>(cpo.url, tokenB);

    for (const v of versionsResponse.data?.data || []) {
      await this.repo.upsertVersion(cpo.id, v.version, v.url);
    }

    return versionsResponse.data;
  }

  /** Mirrors `versionHandler.js:handleCpoVersionsEndpointsRequest`. */
  async sendVersionsEndpointsRequest(clientId: number, cpoId: number, version: string) {
    const cpo = await this.repo.findCpoByIdAndClient(cpoId, clientId);
    if (!cpo) throw new NotFoundException('CPO not found');

    const ocpiVersion = await this.repo.findVersion(cpo.id, version);
    if (!ocpiVersion) throw new NotFoundException('Version not found');
    if (!cpo.token_b) throw new BadRequestException('Token b not found');

    const tokenB = encodeBase64(cpo.token_b);
    const versionsEndResponse = await getMethodOcpi<{ data: { endpoints: { identifier: string; role: string; url: string }[] } }>(
      ocpiVersion.url,
      tokenB,
    );

    const endpoints = versionsEndResponse.data?.data?.endpoints || [];
    await this.repo.replaceVersionEndpoints(ocpiVersion.id, endpoints);

    return versionsEndResponse.data;
  }

  // ---- Locations / tariffs / EVSE reads ----

  async getAllLocationsByCpoId(clientId: number, cpoId: number, query: any) {
    const cpo = await this.repo.findCpoByIdAndClient(cpoId, clientId);
    if (!cpo) throw new NotFoundException('CPO not found');

    const { page } = parsePage(query);
    const limit = query.limit ? Number(query.limit) : 200;
    const skip = (page - 1) * limit;
    const { rows, count } = await this.repo.findLocationsByCpoId(cpoId, { search: query.search, skip, take: limit });
    return { rows, pagination: { totalPages: Math.ceil(count / limit), page } };
  }

  async getLocationById(clientId: number, cpoId: number, locationId: number) {
    const cpo = await this.repo.findCpoByIdAndClient(cpoId, clientId);
    if (!cpo) throw new NotFoundException('CPO not found');

    const location = await this.repo.findLocationById(cpoId, locationId);
    if (!location) throw new NotFoundException('Location not found');
    return location;
  }

  async getAllTariffsByCpoId(clientId: number, cpoId: number, query: any) {
    const cpo = await this.repo.findCpoByIdAndClient(cpoId, clientId);
    if (!cpo) throw new NotFoundException('CPO not found');

    const { page } = parsePage(query);
    const limit = query.limit ? Number(query.limit) : 200;
    const skip = (page - 1) * limit;
    const { rows, count } = await this.repo.findTariffsByCpoId(cpoId, { search: query.search, skip, take: limit });
    return { rows, pagination: { totalPages: Math.ceil(count / limit), page } };
  }

  async getEvseById(cpoId: number, evseId: number) {
    const evse = await this.repo.findEvseById(evseId);
    if (!evse) throw new NotFoundException('EVSE not found');

    const connectorsWithTariffs = await Promise.all(
      evse.connectors.map(async (connector) => {
        const tariffIds = Array.isArray(connector.tariff_ids) ? (connector.tariff_ids as string[]) : [];
        const tariff = tariffIds.length ? await this.repo.findTariffByIdsAndParty(tariffIds) : null;
        return { ...connector, tariff };
      }),
    );

    return { ...evse, connectors: connectorsWithTariffs };
  }

  // ---- Sessions / CDRs ----

  async getAllSessionsByCpoId(clientId: number, cpoId: number, query: any) {
    const cpo = await this.repo.findCpoByIdAndClient(cpoId, clientId);
    if (!cpo) throw new NotFoundException('CPO not found');

    const { page } = parsePage(query);
    const limit = query.limit ? Number(query.limit) : 200;
    const skip = (page - 1) * limit;
    const { rows, count } = await this.repo.findTransactionsByCpoId(cpoId, { search: query.search, skip, take: limit });
    return { rows, pagination: { totalPages: Math.ceil(count / limit), page } };
  }

  async getCdrsByCpoId(clientId: number, cpoId: number, query: any) {
    const cpo = await this.repo.findCpoByIdAndClient(cpoId, clientId);
    if (!cpo) throw new NotFoundException('CPO not found');

    const { page } = parsePage(query);
    const limit = query.limit ? Number(query.limit) : 10;
    const skip = (page - 1) * limit;
    const { rows, count } = await this.repo.findCdrsByCpoId(cpoId, { search: query.search, skip, take: limit });
    return { rows, pagination: { totalPages: Math.ceil(count / limit), page } };
  }

  async getCdrById(clientId: number, cpoId: number, cdrId: number) {
    const cpo = await this.repo.findCpoByIdAndClient(cpoId, clientId);
    if (!cpo) throw new NotFoundException('CPO not found');

    const cdr = await this.repo.findCdrByIdAndCpo(cpoId, cdrId);
    if (!cdr) throw new NotFoundException('CDR not found');
    return cdr;
  }

  async getTransactionByEvseId(cpoId: number, evseId: number, query: any) {
    const { page } = parsePage(query);
    const limit = query.limit ? Number(query.limit) : 10;
    const skip = (page - 1) * limit;
    const { rows, count } = await this.repo.findTransactionsByEvseId(evseId, { search: query.search, skip, take: limit });
    return { rows, pagination: { totalPages: Math.ceil(count / limit), page } };
  }

  async getInitiatedSessionsByEvseId(evseId: number, query: any) {
    const { page } = parsePage(query);
    const limit = query.limit ? Number(query.limit) : 10;
    const skip = (page - 1) * limit;
    const { rows, count } = await this.repo.findCpoSessionsByEvseId(evseId, skip, limit);
    return { rows, pagination: { totalPages: Math.ceil(count / limit), page } };
  }

  async downloadSessionByCpoId(clientId: number, cpoId: number, query: any) {
    const from = query.startDate ? new Date(query.startDate) : undefined;
    const to = query.endDate ? new Date(query.endDate) : undefined;
    return this.repo.findTransactionsForDownload(cpoId, from, to);
  }

  async downloadCdrsByCpoId(clientId: number, cpoId: number, query: any) {
    const from = query.startDate ? new Date(query.startDate) : undefined;
    const to = query.endDate ? new Date(query.endDate) : undefined;
    return this.repo.findCdrsForDownload(cpoId, from, to);
  }

  // ---- Revenue analytics ----

  /** Mirrors `revenueController.js:getEachMonthOcpiCpoAnalytics`. */
  async getMonthlyAnalytics(clientId: number, cpoId: number, query: any) {
    const cpo = await this.repo.findCpoByIdAndClient(cpoId, clientId);
    if (!cpo) throw new NotFoundException('CPO not found');

    const today = new Date();
    const currentYear = today.getFullYear();
    const year = query.year ? Number(query.year) : currentYear;
    const lastMonthIndex = query.month ? Number(query.month) - 1 : year === currentYear ? today.getMonth() : 11;

    const monthlyRevenues: { month: number; revenue: number }[] = [];
    const monthlyConsumptions: { month: number; consumption: number }[] = [];
    const monthlyTransactionCounts: { month: number; transactionCount: number }[] = [];
    const monthlyCobinedata: { month: number; transactionCount: number; consumption: number; revenue: number }[] = [];

    for (let month = 0; month <= lastMonthIndex; month++) {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0, 23, 59, 59);
      const where = { createdAt: { gte: start, lte: end } };

      const revenue = await this.repo.sumTransactionField(cpoId, 'total_price', where);
      const energy = await this.repo.sumTransactionField(cpoId, 'kwh', where);
      const count = await this.repo.countTransactions(cpoId, where);

      monthlyRevenues.push({ month: month + 1, revenue });
      monthlyConsumptions.push({ month: month + 1, consumption: energy });
      monthlyTransactionCounts.push({ month: month + 1, transactionCount: count });
      monthlyCobinedata.push({ month: month + 1, transactionCount: count, consumption: energy, revenue });
    }

    return { monthlyRevenues, monthlyConsumptions, monthlyTransactionCounts, monthlyCobinedata };
  }

  /** Mirrors `revenueController.js:getRevenueCardofCpo`. */
  async getRevenueCard(clientId: number, cpoId: number) {
    const cpo = await this.repo.findCpoByIdAndClient(cpoId, clientId);
    if (!cpo) throw new NotFoundException('CPO not found');

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    const yesterdayStart = new Date(todayStart.getTime() - 86400000);
    const yesterdayEnd = new Date(todayEnd.getTime() - 86400000);

    const safe = (v: number) => Number(v || 0).toFixed(2);

    const [
      todaysRevenue,
      todaysTransactions,
      monthlyRevenue,
      monthlyTransactions,
      yearlyRevenue,
      yearlyTransactions,
      totalRevenue,
      totalTransactions,
      yesterdaysRevenue,
      yesterdaysTransactions,
    ] = await Promise.all([
      this.repo.sumTransactionField(cpoId, 'total_price', { createdAt: { gte: todayStart, lte: todayEnd } }),
      this.repo.countTransactions(cpoId, { createdAt: { gte: todayStart, lte: todayEnd } }),
      this.repo.sumTransactionField(cpoId, 'total_price', { createdAt: { gte: monthStart, lte: monthEnd } }),
      this.repo.countTransactions(cpoId, { createdAt: { gte: monthStart, lte: monthEnd } }),
      this.repo.sumTransactionField(cpoId, 'total_price', { createdAt: { gte: yearStart, lte: yearEnd } }),
      this.repo.countTransactions(cpoId, { createdAt: { gte: yearStart, lte: yearEnd } }),
      this.repo.sumTransactionField(cpoId, 'total_price'),
      this.repo.countTransactions(cpoId),
      this.repo.sumTransactionField(cpoId, 'total_price', { createdAt: { gte: yesterdayStart, lte: yesterdayEnd } }),
      this.repo.countTransactions(cpoId, { createdAt: { gte: yesterdayStart, lte: yesterdayEnd } }),
    ]);

    const avgTransactionValue = todaysTransactions > 0 ? todaysRevenue / todaysTransactions : 0;
    const avgMonthlyTransactionValue = monthlyTransactions > 0 ? monthlyRevenue / monthlyTransactions : 0;
    const growthRate = yesterdaysRevenue > 0 ? ((todaysRevenue - yesterdaysRevenue) / yesterdaysRevenue) * 100 : 0;

    return {
      todaysRevenue: safe(todaysRevenue),
      monthlyRevenue: safe(monthlyRevenue),
      totalRevenue: safe(totalRevenue),
      yearlyRevenue: safe(yearlyRevenue),
      todaysTransactions,
      monthlyTransactions,
      yearlyTransactions,
      totalTransactions,
      yesterdaysRevenue: safe(yesterdaysRevenue),
      yesterdaysTransactions,
      avgTransactionValue: safe(avgTransactionValue),
      avgMonthlyTransactionValue: safe(avgMonthlyTransactionValue),
      growthRate,
    };
  }

  // ---- Remote commands ----

  /** Mirrors `remoteController.js:ocpiRemoteStartSession`. */
  async remoteStartSession(clientId: number, cpoId: number, dto: RemoteStartSessionDto) {
    if (!dto.amount || Number(dto.amount) <= 0) throw new BadRequestException('Amount must be > 0');

    const cpo = await this.repo.findCpoByIdAndClient(cpoId, clientId);
    if (!cpo) throw new NotFoundException('CPO not found');

    const evse = await this.repo.findEvseByUidGlobal(dto.evseId);
    if (!evse || !evse.connectors?.length || !evse.location) throw new NotFoundException('Evse not found');

    const existingSession = await this.repo.findActiveSessionByEvse(dto.evseId);
    if (existingSession) throw new BadRequestException('Session already exists');

    const user = await this.repo.findUserByUserId(dto.userId, clientId);
    if (!user) throw new NotFoundException('User not found');

    const wallet = await this.repo.findWallet(user.id);
    if (!wallet) throw new NotFoundException('Wallet not found');

    const lockedFromTransactions = await this.repo.sumRunningDeviceTransactionMaxAmount(dto.userId);
    const lockedFromSessions = await this.repo.sumPendingCpoSessionMaxAmount(user.id);
    const lockedAmount = lockedFromTransactions + lockedFromSessions;
    const availableBalance = (wallet.balance || 0) - lockedAmount;

    if (lockedAmount > 0 && availableBalance <= 0) {
      throw new BadRequestException('Your wallet balance is already reserved for ongoing sessions');
    }
    if (availableBalance < dto.amount) {
      throw new BadRequestException('Insufficient available balance for this transaction');
    }

    const selectedConnector = evse.connectors.find((c) => c.connector_id === dto.connector_id) || evse.connectors[0];
    if (!selectedConnector) throw new BadRequestException('Connector not found on EVSE');

    const tariffIds = Array.isArray(selectedConnector.tariff_ids) ? (selectedConnector.tariff_ids as string[]) : [];
    if (!tariffIds.length) throw new BadRequestException('No tariff associated with connector');

    const tariff = await this.repo.findTariffByIdsAndParty(tariffIds, evse.location.party_id ?? undefined);
    if (!tariff) throw new NotFoundException('Tariff not found');

    const elements = (tariff.elements as any[]) || [];
    const energyElement = elements.find((el) => Array.isArray(el.price_components) && el.price_components.some((pc: any) => pc.type === 'ENERGY'));
    const energyComponent = energyElement?.price_components.find((pc: any) => pc.type === 'ENERGY');
    if (!energyComponent) throw new BadRequestException('ENERGY price component not defined in tariff');

    const unitPrice = Number(energyComponent.price) || 0;
    const vatPercent = Number(energyComponent.vat) || 0;
    const unitWithVat = unitPrice * (1 + vatPercent / 100);
    if (unitWithVat <= 0) throw new BadRequestException('Invalid tariff price configuration');

    const maxKwh = dto.amount / unitWithVat;
    const sessionId = uuidv4();

    const newSession = await this.repo.createCpoSession({
      sessionId,
      evse_id: evse.id,
      evse_uid: dto.evseId,
      max_amount: dto.amount,
      max_energy: Number(maxKwh.toFixed(2)),
      cpo_id: evse.location.cpoId!,
      user_id: user.id,
      start_date: new Date(),
      end_date: new Date(),
      total_kwh: 0,
      status: 'PENDING',
      last_updated: new Date().toISOString(),
    });

    const version = await this.repo.findVersion(cpo.id, OCPI_CURR_VERSION);
    if (!version) {
      await this.repo.updateCpoSession(newSession.id, { status: 'REJECTED', reason: 'Version not found' });
      throw new NotFoundException('Version not found');
    }

    const commandsEndpoint = await this.repo.findVersionEndpoint(version.id, OCPI_IDENTIFIERS.commands, OCPI_ROLES.receiver);
    if (!commandsEndpoint?.url) {
      await this.repo.updateCpoSession(newSession.id, { status: 'REJECTED', reason: 'Commands endpoint not found' });
      throw new NotFoundException('Commands endpoint not found');
    }

    const clientDetails = await this.repo.findClientDetails(clientId);
    const startUrl = `${OCPI_SERVER}/v1/ocpi/emsp/2.2.1/commands/START_SESSION/${sessionId}`;

    const ocpiCommandData = {
      response_url: startUrl,
      token: {
        country_code: OCPI_CONFIG.country_code,
        party_id: clientDetails?.partyId,
        uid: dto.userId,
        type: 'OTHER',
        contract_id: clientDetails?.brandName,
        visual_number: clientDetails?.brandName,
        issuer: clientDetails?.brandName,
        valid: true,
        whitelist: 'ALWAYS',
        language: 'EN',
        last_updated: new Date().toISOString(),
      },
      authorization_reference: sessionId,
      location_id: evse.location.locationId,
      evse_uid: dto.evseId,
      connector_id: selectedConnector.connector_id,
    };

    const tokenB = encodeBase64(cpo.token_b);

    try {
      const cpoRes = await postMethodOcpi<{ data: { result: string; timeout?: number } }>(
        `${commandsEndpoint.url}/START_SESSION`,
        ocpiCommandData,
        tokenB,
      );

      if (cpoRes.data?.data?.result !== 'ACCEPTED') {
        await this.repo.updateCpoSession(newSession.id, { status: 'REJECTED', reason: 'CPO rejected session' });
        throw new BadRequestException('CPO rejected session');
      }

      await this.repo.updateCpoSession(newSession.id, { timeout: cpoRes.data.data.timeout });
    } catch (error: any) {
      await this.repo.updateCpoSession(newSession.id, { status: 'REJECTED', reason: error.message });
      throw new BadRequestException(error?.response?.data?.data?.message?.[0]?.text || 'Error occurred while starting session on CPO');
    }

    return { session_id: sessionId };
  }

  /** Mirrors `remoteController.js:ocpiRemoteStopSession`. */
  async remoteStopSession(clientId: number, cpoId: number, dto: RemoteStopSessionDto) {
    const cpo = await this.repo.findCpoByIdAndClient(cpoId, clientId);
    if (!cpo) throw new NotFoundException('CPO not found');

    const evse = await this.repo.findEvseByUidGlobal(dto.evseId);
    if (!evse) throw new NotFoundException('EVSE not found');

    const ocpiSession = await this.repo.findTransactionBySessionId(dto.session_id);
    if (!ocpiSession) throw new NotFoundException('OCPI Session not found');

    const session = ocpiSession.authorization_reference
      ? await this.repo.findCpoSessionBySessionId(ocpiSession.authorization_reference)
      : null;
    if (!session) throw new NotFoundException('Session not found');
    if (session.status !== 'ACTIVE') throw new BadRequestException('Session not active');

    const version = await this.repo.findVersion(cpo.id, OCPI_CURR_VERSION);
    if (!version) throw new NotFoundException('Version not found');

    const commandsEndpoint = await this.repo.findVersionEndpoint(version.id, OCPI_IDENTIFIERS.commands, OCPI_ROLES.receiver);
    if (!commandsEndpoint?.url) throw new NotFoundException('Commands endpoint not found');

    const responseUrl = `${OCPI_SERVER}/v1/ocpi/emsp/2.2.1/commands/STOP_SESSION/${dto.session_id}`;
    const commandData = { response_url: responseUrl, session_id: ocpiSession.session_id };
    const tokenB = encodeBase64(cpo.token_b);

    const commandsResponse = await postMethodOcpi<{ data: { result: string } }>(`${commandsEndpoint.url}/STOP_SESSION`, commandData, tokenB);

    if (commandsResponse.data?.data?.result !== 'ACCEPTED') {
      throw new BadRequestException('Invalid response from MSP');
    }

    return session;
  }

  /** Mirrors `remoteController.js:cancelSession`. */
  async cancelSession(clientId: number, cpoId: number, dto: CancelSessionDto) {
    const cpo = await this.repo.findCpoByIdAndClient(cpoId, clientId);
    if (!cpo) throw new NotFoundException('CPO not found');

    const evse = await this.repo.findEvseByUidGlobal(dto.evseId);
    if (!evse) throw new NotFoundException('EVSE not found');

    const session = await this.repo.findCpoSessionBySessionId(dto.session_id);
    if (!session) throw new NotFoundException('Session not found');

    return this.repo.updateCpoSession(session.id, { status: 'CANCELLED' });
  }
}
