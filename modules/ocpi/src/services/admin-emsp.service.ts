import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { AdminEmspRepository } from '../repositories/admin-emsp.repository';
import { getMethodOcpi, postMethodOcpi, putMethodOcpi, patchMethodOcpi, deleteMethodOcpi } from '../utils/ocpi-http.util';
import { encodeBase64, parsePage } from '../utils/ocpi-response.util';
import { formatLocationForOcpi, formatTariffForOcpi, mapChargerStatus } from '../utils/ocpi-convert.util';
import { OCPI_CONFIG, OCPI_CURR_VERSION, OCPI_IDENTIFIERS, OCPI_ROLES, OCPI_SERVER } from '../constants/ocpi.constants';
import { CreateEmspDto, DownloadSessionsDto, PushLocationToEmspDto, PushTariffToEmspDto, UpdateEmspDto } from '../dto/admin-emsp.dto';

/** Admin management of eMSP partners connected to our CPO. Mirrors legacy `src/controllers/admin/ocpi/*`. */
@Injectable()
export class AdminEmspService {
  constructor(private readonly repo: AdminEmspRepository) {}

  async createEmsp(clientId: number, dto: CreateEmspDto) {
    const { party_id, country_code, business_name, url, token_b } = dto;

    const [existing] = (await this.repo.findMany(clientId, undefined, 0, 1000)).rows.filter(
      (e) => e.party_id === party_id && e.country_code === country_code,
    );
    if (existing) {
      throw new BadRequestException('Msp already exists for this party_id and country_code');
    }

    const emsp = await this.repo.create({
      party_id,
      country_code,
      business_name,
      url,
      token_a: uuidv4(),
      token_b,
      clientId,
    });

    return { token_a: emsp.token_a, emsp };
  }

  async getAllEmsps(clientId: number, query: any) {
    const { page, limit, skip, take } = parsePage(query);
    const { rows, count } = await this.repo.findMany(clientId, query.search, skip, take);
    return { data: rows, pagination: { totalPages: Math.ceil(count / limit), page, totalCount: count } };
  }

  async getEmspById(clientId: number, eMSPId: number) {
    const emsp = await this.repo.findById(eMSPId, clientId);
    if (!emsp) throw new NotFoundException('eMsp not found');
    return emsp;
  }

  async updateEmsp(clientId: number, eMSPId: number, dto: UpdateEmspDto) {
    const emsp = await this.repo.findById(eMSPId, clientId);
    if (!emsp) throw new NotFoundException('EMSP connection not found');

    return this.repo.update(eMSPId, {
      ...(dto.business_name && { business_name: dto.business_name }),
      ...(dto.url && { url: dto.url }),
      ...(dto.token_b && { token_b: dto.token_b }),
      ...(dto.status && { status: dto.status as any }),
      ...(dto.party_id && { party_id: dto.party_id }),
    });
  }

  /** Mirrors `handleCredentials.js:handleInitiateHandShakeRequest`. */
  async handshake(clientId: number, eMSPId: number) {
    const emsp = await this.repo.findById(eMSPId, clientId);
    if (!emsp) throw new NotFoundException('eMSP not found');
    if (!emsp.token_b) throw new BadRequestException('Token b not found');

    const clientDetails = await this.repo.findClientDetails(clientId);

    const data = {
      token: emsp.token_a,
      url: `${OCPI_SERVER}/v1/ocpi/cpo/versions`,
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

    const version = await this.repo.findVersion(emsp.id, OCPI_CURR_VERSION);
    if (!version) throw new NotFoundException('Emsp Version not stored');

    const endpoint = await this.repo.findVersionEndpoint(version.id, OCPI_IDENTIFIERS.credentials, OCPI_ROLES.receiver);
    if (!endpoint || !endpoint.url) throw new NotFoundException('Version endpoint not found');

    const tokenB = encodeBase64(emsp.token_b);
    const credentialsResponse = await postMethodOcpi(endpoint.url, data, tokenB);
    const credRes = credentialsResponse.data?.data;
    const role = credRes?.roles?.[0];
    const businessDetails = role?.business_details;

    await this.repo.update(emsp.id, {
      token_b: credRes?.token,
      url: credRes?.url,
      role: role?.role || 'EMSP',
      party_id: role?.party_id,
      country_code: role?.country_code || 'IN',
      business_name: businessDetails?.name || null,
      business_website: businessDetails?.website || null,
      business_logo: businessDetails?.logo?.url || null,
      status: 'CONNECTED',
    });

    return credentialsResponse.data;
  }

  /** Mirrors `versionEndpointController.js:handleVersionsRequest`. */
  async sendVersionsRequest(clientId: number, eMSPId: number) {
    const emsp = await this.repo.findById(eMSPId, clientId);
    if (!emsp) throw new NotFoundException('eMSP not found');
    if (!emsp.url) throw new NotFoundException('Versions endpoint not found');
    if (!emsp.token_b) throw new BadRequestException('Token b not found');

    const tokenB = encodeBase64(emsp.token_b);
    const versionsResponse = await getMethodOcpi<{ data: { version: string; url: string }[] }>(emsp.url, tokenB);

    for (const v of versionsResponse.data?.data || []) {
      await this.repo.upsertVersion(emsp.id, v.version, v.url);
    }

    return versionsResponse.data;
  }

  /** Mirrors `versionEndpointController.js:handleVersionsEndpointsRequest`. */
  async sendVersionsEndpointsRequest(clientId: number, eMSPId: number, version: string) {
    const emsp = await this.repo.findById(eMSPId, clientId);
    if (!emsp) throw new NotFoundException('eMSP not found');

    const ocpiVersion = await this.repo.findVersion(emsp.id, version);
    if (!ocpiVersion) throw new NotFoundException('Version not found');
    if (!emsp.token_b) throw new BadRequestException('Token b not found');

    const tokenB = encodeBase64(emsp.token_b);
    const versionsEndResponse = await getMethodOcpi<{ data: { endpoints: { identifier: string; role: string; url: string }[] } }>(
      ocpiVersion.version_url,
      tokenB,
    );

    const endpoints = versionsEndResponse.data?.data?.endpoints || [];
    await this.repo.replaceVersionEndpoints(ocpiVersion.id, endpoints);

    return versionsEndResponse.data;
  }

  async getStandardTariffByChargerId(clientId: number, eMSPId: number, chargerId: number) {
    const tariff = await this.repo.findTariff(chargerId, clientId);
    if (!tariff) throw new NotFoundException('Tariff not found');

    const roamingTariff = await this.repo.findRoamingTariff({ chargerId, clientId, emspId: eMSPId });
    return { tariff, roamingTariff };
  }

  /** Mirrors `ocpieMSPController.js:pushTariffUpdateToEMSP` + `tariffModule.js:hadlePushTariffToEMSP`. */
  async pushTariffUpdateToEmsp(clientId: number, eMSPId: number, dto: PushTariffToEmspDto) {
    const charger = await this.repo.findCharger(dto.chargerId, clientId);
    if (!charger) throw new NotFoundException('Charger not found');

    let tariff = dto.roamingTariffId
      ? await this.repo.findRoamingTariff({ id: dto.roamingTariffId, clientId, emspId: eMSPId })
      : await this.repo.findRoamingTariff({ chargerId: charger.id, clientId, emspId: eMSPId });

    if (dto.roamingTariffId && !tariff) {
      throw new NotFoundException('Roaming tariff not found');
    }

    if (tariff) {
      tariff = await this.repo.updateRoamingTariff(tariff.id, {
        chargerId: dto.chargerId,
        price: dto.roamingPrice,
        gst: dto.roamingGst,
      });
    } else {
      tariff = await this.repo.createRoamingTariff({
        chargerId: dto.chargerId,
        price: dto.roamingPrice,
        gst: dto.roamingGst,
        clientId,
        emspId: eMSPId,
        vendorId: charger.vendorId,
      });
    }

    const emsp = await this.repo.findById(eMSPId, clientId);
    if (!emsp) throw new NotFoundException('eMSP not found');
    
    if (!tariff) throw new NotFoundException('Tariff not found');

    const version = await this.repo.findVersion(emsp.id, OCPI_CURR_VERSION);
    if (!version) throw new NotFoundException('OCPI Version 2.2.1 not found');

    const endpoint = await this.repo.findVersionEndpoint(version.id, OCPI_IDENTIFIERS.tariffs, OCPI_ROLES.receiver);
    if (!endpoint?.url) throw new NotFoundException('Tariffs endpoint not found');

    const clientDetails = await this.repo.findClientDetails(clientId);
    const partyId = clientDetails?.partyId || 'NEX';
    const payload = formatTariffForOcpi(tariff as any, partyId);
    const putUrl = `${endpoint.url}/${OCPI_CONFIG.country_code}/${partyId}/${tariff.id}`;

    const response = await putMethodOcpi(putUrl, payload, encodeBase64(emsp.token_b));

    const existingPushed = await this.repo.findPushedTariff(emsp.id, tariff.id);
    if (!existingPushed) {
      await this.repo.createPushedTariff({ emspId: emsp.id, roamingTariffId: tariff.id });
    }

    return response.data;
  }

  /** Mirrors `tariffModule.js:deleteTariffToEMSP`. */
  async deleteTariffFromEmsp(clientId: number, eMSPId: number, tariffId: number) {
    const emsp = await this.repo.findById(eMSPId, clientId);
    if (!emsp) throw new NotFoundException('eMSP not found');

    const pushed = await this.repo.findPushedTariff(emsp.id, tariffId);
    if (!pushed) throw new NotFoundException('Tariff not pushed to eMSP');

    const version = await this.repo.findVersion(emsp.id, OCPI_CURR_VERSION);
    if (!version) throw new NotFoundException('OCPI Version 2.2.1 not found');

    const endpoint = await this.repo.findVersionEndpoint(version.id, OCPI_IDENTIFIERS.tariffs, OCPI_ROLES.receiver);
    if (!endpoint?.url) throw new NotFoundException('Tariffs endpoint not found');

    const clientDetails = await this.repo.findClientDetails(clientId);
    const deleteUrl = `${endpoint.url}/${OCPI_CONFIG.country_code}/${clientDetails?.partyId || 'NEX'}/${pushed.roamingTariffId}`;

    const response = await deleteMethodOcpi(deleteUrl, encodeBase64(emsp.token_b));
    await this.repo.deletePushedTariff(emsp.id, pushed.roamingTariffId!);

    return response.data;
  }

  async getAllPushedTariffs(eMSPId: number, query: any) {
    const { page, limit, skip, take } = parsePage(query);
    const { rows, count } = await this.repo.findPushedTariffs(eMSPId, skip, take);
    return { rows, pagination: { totalPages: Math.ceil(count / limit), page, limit, totalCount: count } };
  }

  async getAllSessionsOfMsp(eMSPId: number, query: any) {
    const { page, limit, skip, take } = parsePage(query);
    const { rows, count } = await this.repo.findSessions(eMSPId, {
      chargerRef: query.chargerId ? Number(query.chargerId) : undefined,
      vendorId: query.vendorId ? Number(query.vendorId) : undefined,
      stationId: query.stationId ? Number(query.stationId) : undefined,
      skip,
      take,
    });
    return { rows, pagination: { totalPages: Math.ceil(count / limit), page, limit, totalCount: count } };
  }

  async getAllCdrsOfMsp(eMSPId: number, query: any) {
    const { page, limit, skip, take } = parsePage(query);
    const { rows, count } = await this.repo.findCdrs(eMSPId, skip, take);
    return { rows, pagination: { totalPages: Math.ceil(count / limit), page, limit, totalCount: count } };
  }

  /** Mirrors `mspController.js:getRevenueofMsp` (JS-side monthly aggregation instead of MySQL DATE_FORMAT, to stay Postgres-portable). */
  async getRevenueOfMsp(eMSPId: number, query: any) {
    const now = new Date();
    const selectedYear = query.year ? Number(query.year) : null;

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(selectedYear || now.getFullYear(), selectedYear ? now.getMonth() : now.getMonth(), 1);
    const startOfYear = new Date(selectedYear || now.getFullYear(), 0, 1);
    const trendStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const transactions = await this.repo.findRevenueTransactions(eMSPId, {
      chargerRef: query.chargerId ? Number(query.chargerId) : undefined,
      vendorId: query.vendorId ? Number(query.vendorId) : undefined,
      stationId: query.stationId ? Number(query.stationId) : undefined,
      from: trendStart,
      to: now,
    });

    const sumWhere = (predicate: (d: Date) => boolean) =>
      transactions.filter((t) => t.createdAt && predicate(t.createdAt)).reduce((sum, t) => sum + (t.price || 0), 0);
    const countWhere = (predicate: (d: Date) => boolean) => transactions.filter((t) => t.createdAt && predicate(t.createdAt)).length;

    const totalRevenue = transactions.reduce((sum, t) => sum + (t.price || 0), 0);
    const todayRevenue = sumWhere((d) => d >= startOfToday);
    const monthlyRevenue = sumWhere((d) => d >= startOfMonth);
    const annualRevenue = sumWhere((d) => d >= startOfYear);
    const todayTransactions = countWhere((d) => d >= startOfToday);
    const monthlyTransactions = countWhere((d) => d >= startOfMonth);
    const avgTransactionValue = monthlyTransactions > 0 ? monthlyRevenue / monthlyTransactions : 0;

    const monthlyTrend: { month: string; revenue: number; transactions: number; consumption_kwh: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(trendStart.getFullYear(), trendStart.getMonth() + i, 1);
      const nextD = new Date(trendStart.getFullYear(), trendStart.getMonth() + i + 1, 1);
      const bucket = transactions.filter((t) => t.createdAt && t.createdAt >= d && t.createdAt < nextD);
      monthlyTrend.push({
        month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        revenue: bucket.reduce((sum, t) => sum + (t.price || 0), 0),
        transactions: bucket.length,
        consumption_kwh: bucket.reduce((sum, t) => sum + (t.totalWh || 0) / 1000, 0),
      });
    }

    return {
      year: selectedYear || now.getFullYear(),
      todayRevenue: todayRevenue.toFixed(2),
      monthlyRevenue: monthlyRevenue.toFixed(2),
      annualRevenue: annualRevenue.toFixed(2),
      totalRevenue: totalRevenue.toFixed(2),
      todayTransactions,
      monthlyTransactions,
      avgTransactionValue: avgTransactionValue.toFixed(2),
      monthlyTrend,
    };
  }

  async downloadSessions(eMSPId: number, dto: DownloadSessionsDto) {
    const transactions = await this.repo.findSessionsForDownload({
      emspId: eMSPId,
      chargerIds: dto.chargerIds,
      vendorIds: dto.vendorIds,
      stationIds: dto.stationIds,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
    });
    return { rows: transactions, count: transactions.length };
  }

  async getPushedLocationsOfMsp(clientId: number, eMSPId: number, query: any) {
    const emsp = await this.repo.findById(eMSPId, clientId);
    if (!emsp) throw new NotFoundException('Emsp not found');

    const { page, limit, skip, take } = parsePage(query);
    const { rows, count } = await this.repo.findPushedStations(emsp.id, skip, take);
    return { rows, pagination: { page, limit, totalRecords: count, totalPages: Math.ceil(count / limit) } };
  }

  /** Mirrors `locationModule.js:handleLocationPush`. */
  async pushLocationToEmsp(clientId: number, eMSPId: number, dto: PushLocationToEmspDto) {
    const emsp = await this.repo.findById(eMSPId, clientId);
    if (!emsp) throw new NotFoundException('Emsp not found');

    const station = await this.repo.findStationWithChargers(dto.stationId, dto.chargerIds, emsp.id);
    if (!station || !station.chargers?.length || !station.stationLocation) {
      throw new NotFoundException('Station not found');
    }

    const clientDetails = await this.repo.findClientDetails(clientId);
    const partyId = clientDetails?.partyId || 'NEX';

    const version = await this.repo.findVersion(emsp.id, OCPI_CURR_VERSION);
    const endpoint = version ? await this.repo.findVersionEndpoint(version.id, OCPI_IDENTIFIERS.locations, OCPI_ROLES.receiver) : null;
    if (!endpoint?.url) throw new NotFoundException('EMSP OCPI version or locations endpoint not found');

    const pushLocationUrl = `${endpoint.url}/${OCPI_CONFIG.country_code}/${partyId}/${station.id}_${station.stationUniqueId}`;
    const formattedData = formatLocationForOcpi(station.stationLocation as any, station as any, partyId);

    const response = await putMethodOcpi(pushLocationUrl, formattedData, encodeBase64(emsp.token_b));
    if (response.data?.status_code !== 1000) {
      throw new BadRequestException(response.data?.status_message || 'Failed to push location');
    }

    for (const charger of station.chargers) {
      await this.repo.findOrCreatePushedStation({ chargerId: charger.id, stationId: dto.stationId, emspId: emsp.id });
    }

    return response.data;
  }

  /** Mirrors `locationModule.js:deleteAndRemoveChargerFromEmsp`. */
  async removePushedLocation(clientId: number, eMSPId: number, chargerId: number) {
    const emsp = await this.repo.findById(eMSPId, clientId);
    if (!emsp) throw new NotFoundException('EMSP not found');

    const pushedRecord = await this.repo.findPushedStation(emsp.id, chargerId);
    if (!pushedRecord) throw new NotFoundException('Charger not pushed to EMSP');

    const version = await this.repo.findVersion(emsp.id, OCPI_CURR_VERSION);
    const endpoint = version ? await this.repo.findVersionEndpoint(version.id, OCPI_IDENTIFIERS.locations, OCPI_ROLES.receiver) : null;
    if (!endpoint?.url) throw new NotFoundException('OCPI Locations receiver endpoint not found');

    const station = await this.repo.findStationForRemoval(pushedRecord.stationId, chargerId);
    if (!station || !station.chargers?.length) throw new NotFoundException('Station or charger not found');

    const clientDetails = await this.repo.findClientDetails(clientId);
    const partyId = clientDetails?.partyId || 'NEX';
    const tokenB = encodeBase64(emsp.token_b);
    const charger = station.chargers[0];

    for (const connector of charger.connectors) {
      const evseUid = `${charger.chargerId}_${connector.connectorId}`;
      const patchUrl = `${endpoint.url}/${OCPI_CONFIG.country_code}/${partyId}/${station.id}_${station.stationUniqueId}/${evseUid}`;
      const res = await patchMethodOcpi(patchUrl, { status: 'REMOVED', last_updated: new Date().toISOString() }, tokenB);
      if (res.data?.status_code !== 1000) {
        throw new BadRequestException(res.data?.status_message || `Failed to remove EVSE ${evseUid}`);
      }
    }

    await this.repo.deletePushedStation(pushedRecord.id);
    return { removed: true };
  }

  /** Mirrors `CDRsModule.js:handleSendCdrsFailedSessionDownSessions` + `sendCdrResponse`. */
  async resendFailedCdr(eMSPId: number, sessionId: string) {
    const cdr = await this.repo.findCdrBySession(eMSPId, sessionId);
    if (!cdr) throw new NotFoundException('CDR not found');

    const emsp = await this.repo.findById(eMSPId, cdr.emspId ?? eMSPId);
    const version = await this.repo.findVersion(eMSPId, OCPI_CURR_VERSION);
    const endpoint = version ? await this.repo.findVersionEndpoint(version.id, OCPI_IDENTIFIERS.cdrs, OCPI_ROLES.receiver) : null;
    if (!endpoint?.url) throw new NotFoundException('Cdrs endpoint not found');

    const powerTypeMap: Record<string, string> = {
      AC: 'AC_1_PHASE',
      AC_1_PHASE: 'AC_1_PHASE',
      AC_2_PHASE: 'AC_2_PHASE',
      AC_2_PHASE_SPLIT: 'AC_2_PHASE_SPLIT',
      AC_3_PHASE: 'AC_3_PHASE',
      DC: 'DC',
    };

    const cdrLocation = cdr.cdr_location as any;
    if (cdrLocation?.connector_power_type) {
      cdrLocation.connector_power_type = powerTypeMap[cdrLocation.connector_power_type] ?? cdrLocation.connector_power_type;
    }

    const payload = {
      country_code: cdr.country_code,
      party_id: cdr.party_id,
      id: String(cdr.id),
      session_id: cdr.session_id,
      start_date_time: cdr.start_date_time,
      end_date_time: cdr.end_date_time,
      auth_method: cdr.auth_method,
      location_id: cdr.location_id ? String(cdr.location_id) : undefined,
      evse_uid: cdr.evse_uid !== null ? String(cdr.evse_uid) : undefined,
      connector_id: cdr.connector_id ? String(cdr.connector_id) : undefined,
      currency: cdr.currency,
      tariff_id: cdr.tariff_id,
      total_cost: cdr.total_cost,
      total_energy: cdr.total_energy_kwh || 0,
      total_time: cdr.total_time,
      charging_periods: cdr.charging_periods,
      cdr_token: cdr.cdr_token,
      cdr_location: cdrLocation,
      tariffs: cdr.tariffs,
      authorization_reference: cdr.authorization_reference,
      last_updated: cdr.last_updated,
    };

    const response = await postMethodOcpi(endpoint.url, payload, encodeBase64(emsp?.token_b));
    return response.data;
  }
}
