import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { mapConnectorStandard } from '@modules/ocpi/src/utils/ocpi-convert.util';
import { calculateTotalTime, encodeBase64 } from '@modules/ocpi/src/utils/ocpi-response.util';
import { postMethodOcpi, patchMethodOcpi } from '@modules/ocpi/src/utils/ocpi-http.util';
import {
  OCPI_CONFIG,
  OCPI_CURR_VERSION,
  OCPI_IDENTIFIERS,
  OCPI_ROLES,
} from '@modules/ocpi/src/constants/ocpi.constants';

/**
 * OCPI CPO-export glue for the OCPP gateway: CDR generation/send on stop, and session PATCH on
 * stop/meter-value updates. Mirrors legacy `OCPI/CPOExport/CDRsModule.js` + `commandsModule.js:patchSession`.
 * Kept self-contained (raw `DataSource` queries, no cross-app service injection) to match how every
 * other handler in this app resolves cross-entity data — importing `OcpiModule` here would also
 * register its REST controllers on this app's HTTP server, which is not what we want.
 */
@Injectable()
export class OcpiIntegrationService {
  private readonly logger = new Logger(OcpiIntegrationService.name);

  constructor(private readonly dataSource: DataSource) { }

  private async findEmsp(emspId: number) {
    return this.dataSource
      .createQueryBuilder()
      .select('e.*')
      .from('ocpiemsps', 'e')
      .where('e.id = :id', { id: emspId })
      .getRawOne();
  }

  private async findVersion(emspId: number) {
    return this.dataSource
      .createQueryBuilder()
      .select('v.*')
      .from('ocpiversions', 'v')
      .where('v.emspId = :emspId AND v.version = :version', { emspId, version: OCPI_CURR_VERSION })
      .getRawOne();
  }

  private async findVersionEndpoint(versionId: number, identifier: string, role: string) {
    return this.dataSource
      .createQueryBuilder()
      .select('ve.*')
      .from('ocpiversionendpoints', 've')
      .where('ve.versionId = :versionId AND ve.identifier = :identifier AND ve.role = :role', {
        versionId,
        identifier,
        role,
      })
      .getRawOne();
  }

  private async logOcpiCall(data: {
    request_body: string;
    response_body: string;
    request_type: string;
    endpoint: string;
    status_code: number;
    emspId: number | null;
  }): Promise<void> {
    try {
      await this.dataSource
        .createQueryBuilder()
        .insert()
        .into('ocpilogs')
        .values({ ...data, from: 'SERVER' as any })
        .execute();
    } catch (err: any) {
      this.logger.error('OCPI log insert failed: ' + err.message);
    }
  }

  /** Mirrors `CDRsModule.js:toOcpiCdr`. */
  private async toOcpiCdr(cdr: any): Promise<any> {
    const charger = await this.dataSource
      .createQueryBuilder()
      .select(['c.id', 'c.stationId', 'c.chargerId', 'c.clientId', 'c.powerType'])
      .from('chargers', 'c')
      .where('c.id = :id', { id: cdr.evse_uid })
      .getRawOne();

    if (!charger) return null;

    const connector = await this.dataSource
      .createQueryBuilder()
      .select(['cn.id', 'cn.connectorId', 'cn.portType'])
      .from('connectors', 'cn')
      .where('cn.chargerId = :chargerRef AND cn.connectorId = :connectorId', {
        chargerRef: charger.id,
        connectorId: cdr.connector_id,
      })
      .getRawOne();

    const station = await this.dataSource
      .createQueryBuilder()
      .select(['s.id', 's.stationUniqueId'])
      .from('stations', 's')
      .where('s.id = :id', { id: charger.stationId })
      .getRawOne();

    const location = station
      ? await this.dataSource
        .createQueryBuilder()
        .select('l.*')
        .from('locations', 'l')
        .where('l.stationId = :stationId', { stationId: station.id })
        .getRawOne()
      : null;

    const tariff = await this.dataSource
      .createQueryBuilder()
      .select('rt.*')
      .from('roamingtariffs', 'rt')
      .where('rt.chargerId = :chargerId AND rt.emspId = :emspId', { chargerId: charger.id, emspId: cdr.emspId })
      .getRawOne();

    const session = await this.dataSource
      .createQueryBuilder()
      .select(['cs.id', 'cs.auth_ref'])
      .from('chargingsessions', 'cs')
      .where('cs.sessionId = :sessionId', { sessionId: cdr.session_id })
      .getRawOne();

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
      cdr_location: location && station
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

  /** Mirrors `CDRsModule.js:createCDRFromSession`. */
  async createCdrFromSession(session: any, data: any): Promise<any | null> {
    const eMSP = await this.findEmsp(session.emspId);
    if (!eMSP) {
      this.logger.error('createCdrFromSession: eMSP not found for id ' + session.emspId);
      return null;
    }

    const token = session.tokenId
      ? await this.dataSource
        .createQueryBuilder()
        .select('t.*')
        .from('ocpitokens', 't')
        .where('t.id = :id', { id: session.tokenId })
        .getRawOne()
      : null;

    if (!token) {
      this.logger.error('createCdrFromSession: related token not found for session ' + session.sessionId);
      return null;
    }

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
      charging_periods: JSON.stringify(data.charging_periods || []),
      currency: data.currency || 'INR',
      tariff_id: data.tariff_id != null ? String(data.tariff_id) : null,
      total_cost: JSON.stringify(data.total_cost || { excl_vat: 0, incl_vat: 0 }),
      total_time: data.total_time || 0,
      total_time_cost: data.total_time_cost || null,
      remark: data.remark || null,
      authorization_reference: data.authorization_reference || null,
      tokenId: token.id,
      emspId: eMSP.id,
    };

    const insertResult = await this.dataSource
      .createQueryBuilder()
      .insert()
      .into('ocpicdrs')
      .values(cdrPayload)
      .execute();

    const cdrId = insertResult.raw.insertId;

    const ocpiCdr = await this.toOcpiCdr({
      ...cdrPayload,
      id: cdrId,
      charging_periods: data.charging_periods || [],
      total_cost: data.total_cost || { excl_vat: 0, incl_vat: 0 },
      eMSPParty_id: token.party_id || eMSP.party_id,
      eMSPCountry_code: token.country_code || eMSP.country_code || 'IN',
      token,
    });

    await this.dataSource
      .createQueryBuilder()
      .update('ocpicdrs')
      .set({
        cdr_token: JSON.stringify(ocpiCdr.cdr_token),
        cdr_location: JSON.stringify(ocpiCdr.cdr_location),
        tariffs: JSON.stringify(ocpiCdr.tariffs),
        total_time: ocpiCdr.total_time,
        authorization_reference: ocpiCdr.authorization_reference,
        last_updated: ocpiCdr.last_updated,
      })
      .where('id = :id', { id: cdrId })
      .execute();

    return ocpiCdr;
  }

  /** Mirrors `CDRsModule.js:sendCdrResponse`. */
  async sendCdrResponse(cdr: any, emspId: number): Promise<any> {
    try {
      const eMSP = await this.findEmsp(emspId);
      if (!eMSP) throw new Error('MSP not found');

      const version = await this.findVersion(eMSP.id);
      if (!version) throw new Error('OCPI Version record not found');

      const cdrsEndpoint = await this.findVersionEndpoint(version.id, OCPI_IDENTIFIERS.cdrs, OCPI_ROLES.receiver);
      if (!cdrsEndpoint?.url) throw new Error('Cdrs endpoint not found');

      const authToken = encodeBase64(eMSP.token_b);
      const res = await postMethodOcpi(cdrsEndpoint.url, cdr, authToken);

      await this.logOcpiCall({
        request_body: JSON.stringify(cdr),
        response_body: JSON.stringify(res.data),
        request_type: 'POST',
        endpoint: cdrsEndpoint.url,
        status_code: res.status,
        emspId: eMSP.id,
      });

      return res.data;
    } catch (error: any) {
      this.logger.error('sendCdrResponse failed: ' + error.message);
      await this.logOcpiCall({
        request_body: JSON.stringify({ url: error?.config?.url, method: error?.config?.method, data: error?.config?.data }),
        response_body: JSON.stringify(error?.response?.data || { message: error.message }),
        request_type: error?.config?.method?.toUpperCase() || 'POST',
        endpoint: error?.config?.url || '',
        status_code: error?.response?.status || 500,
        emspId: emspId || null,
      });
      return null;
    }
  }

  /** Mirrors `commandsModule.js:patchSession` — called on OCPI stop (type STOP) and meter-value updates (type UPDATE). */
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
      const eMSP = await this.findEmsp(session.emspId);
      if (!eMSP) throw new Error('MSP not found');

      const version = await this.findVersion(eMSP.id);
      if (!version) throw new Error('OCPI Version not found');

      const sessionsEndpoint = await this.findVersionEndpoint(version.id, OCPI_IDENTIFIERS.sessions, OCPI_ROLES.receiver);
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

      await this.logOcpiCall({
        request_body: JSON.stringify(sessionData),
        response_body: JSON.stringify(res.data),
        request_type: 'PATCH',
        endpoint: url,
        status_code: res.status,
        emspId: eMSP.id,
      });

      return res.data;
    } catch (error: any) {
      this.logger.error('patchSession failed: ' + error.message);
      await this.logOcpiCall({
        request_body: JSON.stringify({ url: error?.config?.url, method: error?.config?.method, data: error?.config?.data }),
        response_body: JSON.stringify(error?.response?.data || { message: error.message }),
        request_type: error?.config?.method?.toUpperCase() || 'PATCH',
        endpoint: error?.config?.url || '',
        status_code: error?.response?.status || 500,
        emspId: session.emspId ?? null,
      });
      return null;
    }
  }
}
