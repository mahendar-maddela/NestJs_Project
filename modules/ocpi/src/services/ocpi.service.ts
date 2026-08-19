import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { OcpiRepository } from '../repositories/ocpi.repository';
import { ChargerCommandService } from '@modules/chargers';
import { generateResponse, parsePagination, calculateTotalTime, encodeBase64 } from '../utils/ocpi-response.util';
import { mapConnectorStandard } from '../utils/ocpi-convert.util';
import { postMethodOcpi, patchMethodOcpi } from '../utils/ocpi-http.util';
import { OCPI_SERVER, EMSP_MAX_AMOUNT, OCPI_CURR_VERSION, OCPI_IDENTIFIERS, OCPI_ROLES, OCPI_CONFIG } from '../constants/ocpi.constants';
import { amountToEnergyConversion } from '@app/common';

/**
 * CPO-role export API: we are the CPO, external eMSPs call in to consume our
 * locations/tariffs/sessions/cdrs and to send credentials/commands.
 * Mirrors legacy `src/OCPI/CPOExport/*` + `src/controllers/admin/ocpi/commandsController.js`.
 */
@Injectable()
export class OcpiService {
  constructor(
    private readonly ocpiRepository: OcpiRepository,
    private readonly chargerCommandService: ChargerCommandService,
  ) {}

  async getCpoById(id: number) {
    const cpo = await this.ocpiRepository.findCpoById(id);
    if (!cpo) {
      throw new NotFoundException(`OCPI CPO with ID ${id} not found`);
    }
    return cpo;
  }

  getVersionsResponse() {
    const versions = [{ version: '2.2.1', url: `${OCPI_SERVER}/v1/ocpi/cpo/versions/2.2.1` }];
    return generateResponse(versions, 1000, 'Success');
  }

  getVersionsDetailsResponse() {
    const version = '2.2.1';
    const base = `${OCPI_SERVER}/v1/ocpi/cpo/${version}`;
    const versionDetails = {
      version,
      endpoints: [
        { identifier: 'versions', role: 'SENDER', url: `${base}/versions` },
        { identifier: 'credentials', role: 'RECEIVER', url: `${base}/credentials` },
        { identifier: 'locations', role: 'SENDER', url: `${base}/locations` },
        { identifier: 'sessions', role: 'SENDER', url: `${base}/sessions` },
        { identifier: 'cdrs', role: 'SENDER', url: `${base}/cdrs` },
        { identifier: 'commands', role: 'RECEIVER', url: `${base}/commands` },
        { identifier: 'tokens', role: 'RECEIVER', url: `${base}/tokens` },
        { identifier: 'tariffs', role: 'SENDER', url: `${base}/tariffs` },
      ],
    };
    return generateResponse(versionDetails, 1000, 'Success');
  }

  async handleCredentialsPost(emspId: number, body: any) {
    const { token: token_b, url, roles } = body;
    if (!token_b || !url || !roles) {
      throw new BadRequestException(generateResponse(null, 400, 'Missing required credentials fields'));
    }

    const emsp = await this.ocpiRepository.findEmspById(emspId);
    if (!emsp) {
      throw new NotFoundException(generateResponse(null, 404, 'eMSP platform not found'));
    }

    const token_c = uuidv4();
    const firstRole = Array.isArray(roles) ? roles[0] : roles;

    await this.ocpiRepository.updateEmsp(emsp.id, {
      token_b,
      token_a: token_c,
      role: firstRole.role || 'EMSP',
      party_id: firstRole.party_id,
      country_code: firstRole.country_code,
      business_name: firstRole.business_details?.name || null,
      business_website: firstRole.business_details?.website || null,
      business_logo: firstRole.business_details?.logo?.url || null,
      status: 'CONNECTED',
    });

    const clientDetails = await this.ocpiRepository.findClientDetails(emsp.clientId);

    const data = {
      token: token_c,
      url: `${OCPI_SERVER}/v1/ocpi/cpo/versions`,
      roles: [
        {
          role: 'CPO',
          party_id: clientDetails?.partyId || 'NEX',
          country_code: 'IN',
          business_details: {
            name: clientDetails?.brandName || 'Nexin EV',
            website: clientDetails?.businessUrl || '',
            logo: {
              url: clientDetails?.logoUrl || '',
              thumbnail: clientDetails?.logoUrl || '',
              category: 'OPERATOR',
              type: 'jpeg',
              width: 512,
              height: 512,
            },
          },
        },
      ],
    };

    return generateResponse(data, 1000, 'Successful and business details saved');
  }

  /** Mirrors legacy `commandsModule.js:startSession` + `commandsController.js:handleStartCommand`. */
  async handleStartCommand(emsp: { id: number; clientId: number }, body: any) {
    const { token, evse_uid, connector_id, authorization_reference, response_url } = body;

    const lastIndex = String(evse_uid || '').lastIndexOf('_');
    const chargerUid = lastIndex > -1 ? evse_uid.substring(0, lastIndex) : null;
    const connectorUid = lastIndex > -1 ? evse_uid.substring(lastIndex + 1) : connector_id;

    if (!chargerUid || !connectorUid) {
      return this.rejectedCommandResponse('Invalid EVSE UID');
    }

    const charger = await this.ocpiRepository.findChargerWithConnectorAndTariff(chargerUid, connectorUid, emsp.id);

    if (!charger || !charger.connectors?.length) {
      return this.rejectedCommandResponse('Invalid charger or connector');
    }

    const connector = charger.connectors[0];
    const tariff = charger.roamingTariffs?.[0];

    if (!tariff) {
      return this.rejectedCommandResponse('Tariff not configured for charger');
    }

    const isDC = charger.powerType !== 'AC';
    const allowedPorts = ['Type 6', 'Type 7'];
    if (isDC && !allowedPorts.includes(connector.portType)) {
      const invalidStates: Record<string, string> = {
        Charging: 'Connector already in use',
        SuspendedEVSE: 'Please reconnect the connector',
        SuspendedEV: 'Please reconnect the connector',
        Finishing: 'Connector already engaged',
        Reserved: 'Connector already reserved',
        Unavailable: 'Connector unavailable',
        Faulted: 'Connector faulted',
      };
      if (invalidStates[connector.status]) {
        return this.rejectedCommandResponse(invalidStates[connector.status]);
      }
    }

    let ocpiToken = token?.uid ? await this.ocpiRepository.findOcpiTokenByUid(token.uid) : null;
    if (!ocpiToken && token) {
      ocpiToken = await this.ocpiRepository.createOcpiToken({
        uid: token.uid,
        type: token.type,
        country_code: token.country_code,
        party_id: token.party_id,
        contract_id: token.contract_id,
        visual_number: token.visual_number || null,
        issuer: token.issuer || null,
        group_id: token.group_id || null,
        valid: token.valid ?? true,
        whitelist: token.whitelist,
        last_updated: token.last_updated ? new Date(token.last_updated) : new Date(),
        mspId: emsp.id,
        sendToMsp: false,
      });
    }

    const prefixConfig = await this.ocpiRepository.findPrefixConfig(charger.clientId);
    const sessionId = `${prefixConfig?.session || 'SESS'}${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

    const maxAmount = EMSP_MAX_AMOUNT;
    const maxEnergy = amountToEnergyConversion(maxAmount, tariff.gst || 0, tariff.price || 0, true);

    await this.ocpiRepository.createChargingSession({
      sessionId,
      status: 'Initiated',
      maxEnergy,
      maxAmount,
      connectorId: Number(connector.connectorId) || null,
      chargerId: charger.chargerId,
      chargerRef: charger.id,
      platform: 'OCPI',
      calcTaxPercent: tariff.gst || 0,
      calcPrice: tariff.price || 0,
      tariffName: tariff.name || 'Standard',
      emspId: emsp.id,
      msp_res_url: response_url,
      tokenId: ocpiToken?.id ?? null,
      auth_ref: authorization_reference,
      clientId: charger.clientId,
    });

    // Actual RemoteStartTransaction dispatch happens asynchronously via the
    // OCPP gateway (Redis-backed), never inline in the REST API. See modules/chargers/ChargerCommandService.
    await this.chargerCommandService.remoteStartTransaction(charger.chargerId, Number(connector.connectorId), sessionId);

    const result = {
      result: 'ACCEPTED',
      timeout: 300,
      message: [{ language: 'en', text: 'Session Initiated successfully' }],
    };
    return generateResponse(result, 1000, 'Success');
  }

  /** Mirrors legacy `commandsModule.js:stopCommand` + `commandsController.js:handleStopCommand`. */
  async handleStopCommand(body: any) {
    const { session_id } = body;

    const session = await this.ocpiRepository.findChargingSessionBySessionId(session_id);
    if (!session) {
      return this.rejectedCommandResponse('Session not found');
    }

    const deviceTransaction = session.transactionId
      ? await this.ocpiRepository.findDeviceTransactionById(session.transactionId)
      : null;

    if (!deviceTransaction) {
      return this.rejectedCommandResponse('Transaction not found');
    }

    await this.ocpiRepository.updateChargingSession(session.id, { status: 'Completed', stopFrom: 'OCPI' });

    await this.chargerCommandService.remoteStopTransaction(session.chargerId || '', Number(deviceTransaction.transactionId));

    const result = {
      result: 'ACCEPTED',
      timeout: 300,
      message: [{ language: 'en', text: 'SUCCESS' }],
    };
    return generateResponse(result, 1000, 'Success');
  }

  private rejectedCommandResponse(message: string) {
    const failure = {
      result: 'REJECTED',
      timeout: 300,
      message: [{ language: 'en', text: message }],
    };
    return generateResponse(failure, 2000, 'Failed');
  }

  async pullTariffsForEmsps(emspId: number, query: any) {
    const { skip, take } = parsePagination(query);
    const pushedTariffs = await this.ocpiRepository.findPushedTariffs({ emspId }, skip, take);
    return generateResponse(pushedTariffs, 1000, 'Tariffs fetched successfully');
  }

  async pullLocationsForEmsps(emspId: number, query: any) {
    const { skip, take } = parsePagination(query);
    const pushedStations = await this.ocpiRepository.findPushedStations({ emspId }, skip, take);
    return generateResponse(pushedStations, 1000, 'Locations fetched successfully');
  }

  async getCdrs(emspId: number, query: any) {
    const { skip, take } = parsePagination(query);
    const cdrs = await this.ocpiRepository.findCdrs({ emspId }, skip, take);
    return generateResponse(cdrs, 1000, 'CDRs fetched successfully');
  }

  /** Mirrors legacy `sessionModule.js:getOCPISessionByEmspId`. */
  async getSessionsForEmsp(emspId: number, query: any) {
    const { skip, take } = parsePagination(query);
    const sessions = await this.ocpiRepository.findSessionsByEmspId(emspId, {
      dateFrom: query.date_from,
      dateTo: query.date_to,
      skip,
      take,
    });

    const emsp = await this.ocpiRepository.findEmspById(emspId);

    const formatted = await Promise.all(
      sessions.map(async (session) => {
        const tx = session.deviceTransaction;
        const token = await this.ocpiRepository.findTokenById(session.tokenId);
        const connector = session.charger?.connectors?.find((c: any) => c.connectorId === String(session.connectorId));

        return {
          country_code: emsp?.country_code || 'IN',
          party_id: emsp?.party_id,
          id: session.sessionId,
          start_date_time: tx?.startDate?.toISOString() || session.createdAt.toISOString(),
          end_date_time: tx?.status === 1 ? tx?.stopDate?.toISOString() || null : null,
          kwh: tx ? (tx.totalWh || 0) / 1000 : 0,
          auth_method: 'COMMAND',
          authorization_reference: session.auth_ref || null,
          location_id: session.charger?.station ? `${session.charger.station.id}_${session.charger.station.stationUniqueId}` : null,
          evse_uid: session.charger ? `${session.charger.chargerId}_${session.connectorId}` : null,
          connector_id: session.charger ? `${session.charger.chargerId}_${session.connectorId}` : null,
          currency: 'INR',
          cdr_token: token
            ? { country_code: emsp?.country_code || 'IN', party_id: emsp?.party_id, uid: token.uid, type: token.type, contract_id: token.contract_id }
            : null,
          charging_periods: [
            {
              start_date_time: tx?.startDate?.toISOString() || session.createdAt.toISOString(),
              dimensions: [
                { type: 'STATE_OF_CHARGE', volume: Number(tx?.stopSoc || tx?.startSoc) || 0.0 },
                { type: 'ENERGY_IMPORT', volume: Number(tx?.totalWh || 0) / 1000 || 0.0 },
              ],
            },
          ],
          total_cost: { excl_vat: parseFloat(String(tx?.amount || 0)) || 0.0, incl_vat: parseFloat(String(tx?.price || 0)) || 0.0 },
          status: tx?.status === 1 ? 'COMPLETED' : 'ACTIVE',
          last_updated: session.updatedAt.toISOString(),
          _connector: connector,
        };
      }),
    );

    return generateResponse(
      formatted.map(({ _connector, ...rest }) => rest),
      1000,
      'Sessions fetched successfully',
    );
  }

  /** Mirrors legacy `CDRsModule.js:toOcpiCdr`. */
  private async toOcpiCdr(cdr: any): Promise<any> {
    const charger = await this.ocpiRepository.findChargerForCdr(cdr.evse_uid, cdr.connector_id);
    if (!charger) return null;

    const station = await this.ocpiRepository.findStationWithLocation(charger.stationId);
    const location = station?.stationLocation ?? null;
    const connector = charger.connectors?.[0] ?? null;

    const tariff = await this.ocpiRepository.findRoamingTariffByChargerAndEmsp(charger.id, cdr.emspId);
    const session = await this.ocpiRepository.findChargingSessionBySessionId(cdr.session_id);

    const totalTime = calculateTotalTime(cdr.start_date_time, cdr.end_date_time);

    return {
      country_code: cdr.country_code,
      party_id: cdr.party_id,
      id: `${cdr.id}`,
      session_id: cdr.session_id,
      start_date_time: new Date(cdr.start_date_time).toISOString(),
      end_date_time: new Date(cdr.end_date_time).toISOString(),
      cdr_token: {
        country_code: cdr.eMSPCountry_code || OCPI_CONFIG.country_code,
        party_id: cdr.eMSPParty_id || cdr.party_id,
        uid: cdr.token?.uid,
        type: cdr.token?.type,
        contract_id: cdr.token?.contract_id,
      },
      auth_method: cdr.auth_method,
      cdr_location: location && station && charger
        ? {
            id: `${station.id}_${station.stationUniqueId}`,
            name: location.address || null,
            address: location.address,
            city: location.city,
            state: location.state,
            postal_code: location.pincode || null,
            country: OCPI_CONFIG.country,
            coordinates: { latitude: String(location.latitude), longitude: String(location.longitude) },
            evse_uid: charger.chargerId && connector ? `${charger.chargerId}_${connector.connectorId}` : null,
            evse_id: charger.chargerId || null,
            connector_id: charger.chargerId && connector ? `${charger.chargerId}_${connector.connectorId}` : null,
            connector_standard: mapConnectorStandard(connector?.portType),
            connector_format: 'CABLE',
            connector_power_type: charger.powerType === 'AC' ? 'AC_1_PHASE' : 'DC',
          }
        : {},
      currency: cdr.currency,
      tariffs: tariff
        ? [
            {
              country_code: OCPI_CONFIG.country_code,
              party_id: cdr.party_id,
              id: `${tariff.id}`,
              currency: tariff.currency || 'INR',
              elements: [
                {
                  price_components: [
                    { type: 'ENERGY', price: parseFloat(tariff.price || 0), vat: parseFloat(tariff.gst || 0), step_size: 1 },
                  ],
                },
              ],
              last_updated: new Date(tariff.updatedAt).toISOString(),
            },
          ]
        : [],
      charging_periods: cdr.charging_periods || [],
      total_cost: cdr.total_cost || 0,
      total_energy: Number(cdr.total_energy_kwh) || 0,
      total_time: totalTime || cdr.total_time || 0,
      total_time_cost: 0,
      remark: cdr.remark || null,
      authorization_reference: session?.auth_ref || null,
      last_updated: new Date().toISOString(),
    };
  }

  /** Mirrors legacy `CDRsModule.js:createCDRFromSession`, called from `StopTransactionHandlerV16.handleOcpiStop`. */
  async createCdrFromSession(session: any, data: any): Promise<any> {
    const eMSP = await this.ocpiRepository.findEmspById(session.emspId);
    if (!eMSP) throw new Error('eMSP not found');

    const token = await this.ocpiRepository.findTokenById(session.tokenId);
    if (!token) throw new Error('Related token or MSP not found for session');

    const cdrPayload: any = {
      country_code: data.country_code || 'IN',
      party_id: data.party_id,
      session_id: session.sessionId,
      start_date_time: data.start_date_time
        ? new Date(data.start_date_time).toISOString()
        : new Date(session.startTime || Date.now()).toISOString(),
      end_date_time: data.end_date_time ? new Date(data.end_date_time).toISOString() : new Date().toISOString(),
      auth_method: data.auth_method || 'COMMAND',
      location_id: data.location_id,
      evse_uid: data.evse_uid,
      connector_id: data.connector_id || '1',
      total_energy_kwh: data.total_energy || 0,
      charging_periods: data.charging_periods || [],
      currency: data.currency || 'INR',
      tariff_id: data.tariff_id != null ? String(data.tariff_id) : null,
      total_cost: data.total_cost || { excl_vat: 0, incl_vat: 0 },
      total_time: data.total_time || 0,
      total_time_cost: data.total_time_cost || null,
      remark: data.remark || null,
      authorization_reference: data.authorization_reference || null,
      tokenId: token.id,
      emspId: eMSP.id,
    };

    const cdr = await this.ocpiRepository.createOcpiCdr(cdrPayload);

    const ocpiCdr = await this.toOcpiCdr({
      ...cdrPayload,
      id: cdr.id,
      eMSPParty_id: token.party_id || eMSP.party_id,
      eMSPCountry_code: token.country_code || eMSP.country_code || 'IN',
      token,
    });

    await this.ocpiRepository.updateOcpiCdr(cdr.id, {
      cdr_token: ocpiCdr.cdr_token,
      cdr_location: ocpiCdr.cdr_location,
      tariffs: ocpiCdr.tariffs,
      total_time: ocpiCdr.total_time,
      authorization_reference: ocpiCdr.authorization_reference,
      last_updated: ocpiCdr.last_updated,
    } as any);

    return ocpiCdr;
  }

  /** Mirrors legacy `CDRsModule.js:sendCdrResponse`. */
  async sendCdrResponse(cdr: any, emspId: number): Promise<any> {
    try {
      const eMSP = await this.ocpiRepository.findEmspById(emspId);
      if (!eMSP) throw new Error('MSP not found');

      const version = await this.ocpiRepository.findVersion(eMSP.id, OCPI_CURR_VERSION);
      if (!version) throw new Error('OCPI Version record not found');

      const cdrsEndpoint = await this.ocpiRepository.findVersionEndpoint(version.id, OCPI_IDENTIFIERS.cdrs, OCPI_ROLES.receiver);
      if (!cdrsEndpoint?.url) throw new Error('Cdrs endpoint not found');

      const authToken = encodeBase64(eMSP.token_b);
      const res = await postMethodOcpi(cdrsEndpoint.url, cdr, authToken);

      await this.ocpiRepository
        .createOcpiLog({
          request_body: JSON.stringify(cdr),
          response_body: JSON.stringify(res.data),
          request_type: 'POST',
          endpoint: cdrsEndpoint.url,
          status_code: res.status,
          emspId: eMSP.id,
        } as any)
        .catch(() => undefined);

      return res.data;
    } catch (error: any) {
      await this.ocpiRepository
        .createOcpiLog({
          request_body: JSON.stringify({ url: error?.config?.url, method: error?.config?.method, data: error?.config?.data }),
          response_body: JSON.stringify(error?.response?.data || { message: error.message }),
          request_type: error?.config?.method?.toUpperCase() || 'POST',
          endpoint: error?.config?.url || '',
          status_code: error?.response?.status || 500,
          emspId: emspId || null,
        } as any)
        .catch(() => undefined);
      throw error;
    }
  }

  /** Mirrors legacy `commandsModule.js:patchSession`, called on OCPI stop (type STOP) and meter-value updates (type UPDATE). */
  async patchSession(
    session: any,
    deviceTransaction: any,
    tariffId: number,
    amount: number,
    gst: number,
    type: 'STOP' | 'UPDATE' = 'STOP',
    partyId: string,
  ): Promise<any> {
    try {
      const eMSP = await this.ocpiRepository.findEmspById(session.emspId);
      if (!eMSP) throw new Error('MSP not found');

      const version = await this.ocpiRepository.findVersion(eMSP.id, OCPI_CURR_VERSION);
      if (!version) throw new Error('OCPI Version not found');

      const sessionsEndpoint = await this.ocpiRepository.findVersionEndpoint(version.id, OCPI_IDENTIFIERS.sessions, OCPI_ROLES.receiver);
      if (!sessionsEndpoint?.url) throw new Error('Sessions endpoint not found');

      const url = `${sessionsEndpoint.url}/${OCPI_CONFIG.country_code}/${partyId}/${session.sessionId}`;

      const kwh = Number(((deviceTransaction.totalWh || 0) / 1000).toFixed(4));
      const soc = deviceTransaction.stopSoc || 0;
      const now = new Date().toISOString();
      const round4 = (value: number) => Number(value.toFixed(4));

      const sessionData: any = {
        start_date_time: new Date(deviceTransaction.startDate).toISOString(),
        end_date_time: type === 'STOP' ? now : undefined,
        kwh,
        auth_method: 'COMMAND',
        currency: 'INR',
        charging_periods: [
          {
            start_date_time: new Date(deviceTransaction.startDate).toISOString(),
            dimensions: [
              { type: 'STATE_OF_CHARGE', volume: parseFloat(soc) },
              { type: 'ENERGY', volume: parseFloat(String(kwh)) },
            ],
            tariff_id: `${tariffId}`,
          },
        ],
        total_cost: { excl_vat: round4(amount), incl_vat: round4(amount + gst) },
        status: type === 'STOP' ? 'COMPLETED' : 'ACTIVE',
        last_updated: now,
      };

      Object.keys(sessionData).forEach((key) => sessionData[key] === undefined && delete sessionData[key]);

      const res = await patchMethodOcpi(url, sessionData, encodeBase64(eMSP.token_b));

      await this.ocpiRepository
        .createOcpiLog({
          request_body: JSON.stringify(sessionData),
          response_body: JSON.stringify(res.data),
          request_type: 'PATCH',
          endpoint: url,
          status_code: res.status,
          emspId: eMSP.id,
        } as any)
        .catch(() => undefined);

      return res.data;
    } catch (error: any) {
      await this.ocpiRepository
        .createOcpiLog({
          request_body: JSON.stringify({ url: error?.config?.url, method: error?.config?.method, data: error?.config?.data }),
          response_body: JSON.stringify(error?.response?.data || { message: error.message }),
          request_type: error?.config?.method?.toUpperCase() || 'PATCH',
          endpoint: error?.config?.url || '',
          status_code: error?.response?.status || 500,
          emspId: session.emspId,
        } as any)
        .catch(() => undefined);
      throw error;
    }
  }
}
