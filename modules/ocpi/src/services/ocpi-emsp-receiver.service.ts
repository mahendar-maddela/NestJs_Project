import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { RealtimeService } from '@app/realtime';
import { OcpiCpoPartnerRepository } from '../repositories/ocpi-cpo-partner.repository';
import { generateResponse } from '../utils/ocpi-response.util';
import { OCPI_CONFIG, OCPI_SERVER } from '../constants/ocpi.constants';
import {
  OcpiCdrPostDto,
  OcpiConnectorPatchDto,
  OcpiEvsePatchDto,
  OcpiLocationPatchDto,
  OcpiLocationPutDto,
  OcpiSessionPatchDto,
  OcpiSessionPutDto,
  OcpiTariffPutDto,
} from '../dto/ocpi-cpo-partner.dto';
import { OcpiCredentialsDto } from '../dto/ocpi-credentials.dto';

/**
 * We-are-eMSP public receiver: an external roaming CPO authenticates with Token A
 * and pushes locations/tariffs/sessions/cdrs to us, and calls back with command results.
 * Mirrors legacy `src/OCPI/ImportEmsp/*`.
 */
@Injectable()
export class OcpiEmspReceiverService {
  constructor(
    private readonly repo: OcpiCpoPartnerRepository,
    private readonly realtimeService: RealtimeService,
  ) {}

  getCpoVersions() {
    const data = [{ version: '2.2.1', url: `${OCPI_SERVER}/v1/ocpi/emsp/versions/2.2.1` }];
    return generateResponse(data, 1000, 'Success');
  }

  getCpoVersionDetails() {
    const base = `${OCPI_SERVER}/v1/ocpi/emsp`;
    const version = '2.2.1';
    const data = {
      version,
      endpoints: [
        { identifier: 'versions', role: 'SENDER', url: `${base}/${version}/versions` },
        { identifier: 'credentials', role: 'RECEIVER', url: `${base}/${version}/credentials` },
        { identifier: 'cdrs', role: 'RECEIVER', url: `${base}/${version}/cdrs` },
        { identifier: 'locations', role: 'RECEIVER', url: `${base}/${version}/locations` },
        { identifier: 'sessions', role: 'RECEIVER', url: `${base}/${version}/sessions` },
        { identifier: 'tariffs', role: 'RECEIVER', url: `${base}/${version}/tariffs` },
        { identifier: 'commands', role: 'SENDER', url: `${base}/${version}/commands` },
      ],
    };
    return generateResponse(data, 1000, 'Success');
  }

  /** Mirrors `HandshakeHandler.js:cpoHandShakeResponse`. */
  async handleHandshake(cpo: { id: number; clientId: number }, body: OcpiCredentialsDto) {
    const { token: token_b, url, roles } = body;
    if (!token_b || !url || !roles) {
      throw new BadRequestException(generateResponse(null, 400, 'Missing required credentials fields'));
    }

    const existing = await this.repo.findCpoById(cpo.id);
    if (!existing) throw new NotFoundException(generateResponse(null, 404, 'Cpo platform not found'));

    const token_c = uuidv4();
    const firstRole: any = Array.isArray(roles) ? roles[0] : roles;

    await this.repo.updateCpo(existing.id, {
      token_b,
      token_a: token_c,
      role: firstRole.role || 'CPO',
      party_id: firstRole.party_id,
      country_code: firstRole.country_code,
      business_name: firstRole.business_details?.name || null,
      business_website: firstRole.business_details?.website || null,
      business_logo: firstRole.business_details?.logo?.url || null,
      status: 'CONNECTED',
    });

    const clientDetails = existing.clientId ? await this.repo.findClientDetails(existing.clientId) : null;

    const data = {
      token: token_c,
      url: `${OCPI_SERVER}/v1/ocpi/emsp/versions`,
      roles: [
        {
          role: 'EMSP',
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

    return generateResponse(data, 1000, 'Successful and business details saved');
  }

  // ---- Locations ----

  /** Mirrors `locationHandle.js:getCpoLocation`. */
  async getLocation(cpo: { id: number }, country_code: string, party_id: string, locationId: string) {
    const location = await this.repo.findLocationByOcpiId(cpo.id, locationId);
    if (!location) throw new NotFoundException(generateResponse(null, 2003, 'Location not found'));
    return generateResponse(this.transformLocation(location), 1000, 'Success');
  }

  /** Mirrors `locationHandle.js:createOrUpdateLocation`. */
  async putLocation(cpo: { id: number }, country_code: string, party_id: string, locationId: string, dto: OcpiLocationPutDto) {
    const location = await this.repo.upsertLocation(cpo.id, locationId, {
      country_code,
      party_id,
      publish: dto.publish ?? true,
      name: dto.name,
      address: dto.address,
      city: dto.city,
      postal_code: dto.postal_code,
      state: dto.state,
      country: dto.country,
      latitude: dto.coordinates?.latitude?.toString(),
      longitude: dto.coordinates?.longitude?.toString(),
      parking_type: dto.parking_type,
      time_zone: dto.time_zone,
      last_updated: dto.last_updated,
    });

    if (!location) return;

    for (const evse of dto.evses || []) {
      const createdEvse = await this.repo.upsertEvse(location.id, evse.uid, {
        evse_id: evse.evse_id,
        status: evse.status,
        last_updated: evse.last_updated,
        floor_level: evse.floor_level || null,
        physical_reference: evse.physical_reference || null,
      });

      if (!createdEvse) continue;

      for (const connector of evse.connectors || []) {
        await this.repo.upsertConnector(createdEvse.id, connector.id, {
          standard: connector.standard,
          format: connector.format,
          power_type: connector.power_type,
          max_voltage: connector.max_voltage,
          max_amperage: connector.max_amperage,
          max_electric_power: connector.max_electric_power ?? null,
          tariff_ids: (connector.tariff_ids as any) ?? null,
          last_updated: connector.last_updated,
        });
      }
    }

    return generateResponse('ACCEPTED', 1000, 'Success');
  }

  /** Mirrors `locationHandle.js:patchLocation`. */
  async patchLocation(cpo: { id: number }, country_code: string, party_id: string, locationId: string, dto: OcpiLocationPatchDto) {
    const location = await this.repo.findLocationRowForPatch(cpo.id, locationId);
    if (!location) throw new NotFoundException(generateResponse(null, 2001, 'Location not found'));

    await this.repo.patchLocation(cpo.id, locationId, {
      ...(dto.publish !== undefined && { publish: dto.publish }),
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.address !== undefined && { address: dto.address }),
      ...(dto.city !== undefined && { city: dto.city }),
      ...(dto.postal_code !== undefined && { postal_code: dto.postal_code }),
      ...(dto.state !== undefined && { state: dto.state }),
      ...(dto.country !== undefined && { country: dto.country }),
      ...(dto.coordinates && { latitude: String(dto.coordinates.latitude), longitude: String(dto.coordinates.longitude) }),
      ...(dto.parking_type !== undefined && { parking_type: dto.parking_type }),
      ...(dto.time_zone !== undefined && { time_zone: dto.time_zone }),
      last_updated: dto.last_updated,
    });

    return generateResponse('ACCEPTED', 1000, 'Location updated');
  }

  /** Mirrors `locationHandle.js:patchEvse`. */
  async patchEvse(cpo: { id: number }, country_code: string, party_id: string, locationId: string, evseUid: string, dto: OcpiEvsePatchDto) {
    const location = await this.repo.findLocationRowForPatch(cpo.id, locationId);
    if (!location) throw new NotFoundException(generateResponse(null, 2001, 'Location not found'));

    const evse = await this.repo.findEvseByUid(location.id, evseUid);
    if (!evse) throw new NotFoundException(generateResponse(null, 2002, 'EVSE not found'));

    await this.repo.updateEvse(evse.id, {
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.floor_level !== undefined && { floor_level: dto.floor_level }),
      ...(dto.physical_reference !== undefined && { physical_reference: dto.physical_reference }),
      ...(dto.latitude !== undefined && { latitude: String(dto.latitude) }),
      ...(dto.longitude !== undefined && { longitude: String(dto.longitude) }),
      last_updated: dto.last_updated,
    });

    return generateResponse('ACCEPTED', 1000, 'EVSE updated');
  }

  /** Mirrors `locationHandle.js:patchConnector`. */
  async patchConnector(
    cpo: { id: number },
    country_code: string,
    party_id: string,
    locationId: string,
    evseUid: string,
    connectorId: string,
    dto: OcpiConnectorPatchDto,
  ) {
    const location = await this.repo.findLocationRowForPatch(cpo.id, locationId);
    if (!location) throw new NotFoundException(generateResponse(null, 2001, 'Location not found'));

    const evse = await this.repo.findEvseByUid(location.id, evseUid);
    if (!evse) throw new NotFoundException(generateResponse(null, 2002, 'EVSE not found'));

    const connector = await this.repo.findConnector(evse.id, connectorId);
    if (!connector) throw new NotFoundException(generateResponse(null, 2003, 'Connector not found'));

    await this.repo.updateConnector(connector.id, {
      ...(dto.standard !== undefined && { standard: dto.standard }),
      ...(dto.format !== undefined && { format: dto.format }),
      ...(dto.power_type !== undefined && { power_type: dto.power_type }),
      ...(dto.max_voltage !== undefined && { max_voltage: dto.max_voltage }),
      ...(dto.max_amperage !== undefined && { max_amperage: dto.max_amperage }),
      ...(dto.max_electric_power !== undefined && { max_electric_power: dto.max_electric_power }),
      ...(dto.tariff_ids !== undefined && { tariff_ids: dto.tariff_ids as any }),
      last_updated: dto.last_updated,
    });

    return generateResponse('ACCEPTED', 1000, 'Connector updated');
  }

  private transformLocation(location: any) {
    return {
      country_code: location.country_code,
      party_id: location.party_id,
      id: location.locationId,
      publish: location.publish,
      name: location.name,
      address: location.address,
      city: location.city,
      postal_code: location.postal_code,
      country: location.country,
      coordinates: { latitude: location.latitude, longitude: location.longitude },
      parking_type: location.parking_type,
      evses: (location.evses || []).map((evse: any) => ({
        uid: evse.uid,
        evse_id: evse.evse_id,
        status: evse.status,
        connectors: (evse.connectors || []).map((conn: any) => ({
          id: conn.connector_id,
          standard: conn.standard,
          format: conn.format,
          power_type: conn.power_type,
          max_voltage: conn.max_voltage,
          max_amperage: conn.max_amperage,
          last_updated: conn.last_updated,
          tariff_ids: conn.tariff_ids,
        })),
        last_updated: evse.last_updated,
      })),
      time_zone: location.time_zone,
      last_updated: location.last_updated,
    };
  }

  // ---- Tariffs ----

  /** Mirrors `tariffHandler.js:getTariff`. */
  async getTariff(cpo: { id: number }, country_code: string, party_id: string, tariffId: string) {
    const tariff = await this.repo.findTariff(cpo.id, country_code, party_id, tariffId);
    if (!tariff) throw new NotFoundException(generateResponse(null, 2004, 'Tariff not found'));
    return generateResponse(this.transformTariff(tariff), 1000, 'Success');
  }

  /** Mirrors `tariffHandler.js:createOrUpdateTariff`. */
  async putTariff(cpo: { id: number }, country_code: string, party_id: string, tariffId: string, dto: OcpiTariffPutDto) {
    await this.repo.upsertTariff(cpo.id, country_code, party_id, tariffId, {
      currency: dto.currency,
      type: dto.type ?? null,
      tariff_alt_text: (dto.tariff_alt_text as any) ?? null,
      tariff_alt_url: dto.tariff_alt_url ?? null,
      min_price: dto.min_price ?? null,
      max_price: dto.max_price ?? null,
      elements: dto.elements as any,
      start_date_time: dto.start_date_time ?? null,
      end_date_time: dto.end_date_time ?? null,
      last_updated: dto.last_updated,
    });
    return generateResponse('ACCEPTED', 1000, 'Success');
  }

  /** Mirrors `tariffHandler.js:deleteCpoTariff`. */
  async deleteTariff(cpo: { id: number }, country_code: string, party_id: string, tariffId: string) {
    const tariff = await this.repo.findTariff(cpo.id, country_code, party_id, tariffId);
    if (!tariff) throw new NotFoundException(generateResponse(null, 2004, 'Tariff not found'));
    await this.repo.deleteTariff(cpo.id, country_code, party_id, tariffId);
    return generateResponse('ACCEPTED', 1000, 'Success');
  }

  private transformTariff(tariff: any) {
    return {
      country_code: tariff.country_code,
      party_id: tariff.party_id,
      id: tariff.tariff_id,
      currency: tariff.currency,
      type: tariff.type || undefined,
      tariff_alt_text: tariff.tariff_alt_text || undefined,
      tariff_alt_url: tariff.tariff_alt_url || undefined,
      min_price: tariff.min_price || undefined,
      max_price: tariff.max_price || undefined,
      elements: tariff.elements,
      start_date_time: tariff.start_date_time || undefined,
      end_date_time: tariff.end_date_time || undefined,
      last_updated: tariff.last_updated,
    };
  }

  // ---- Sessions ----

  /** Mirrors `sessionHandler.js:getSession`. */
  async getSession(cpo: { id: number }, country_code: string, party_id: string, sessionId: string) {
    const session = await this.repo.findTransaction(cpo.id, country_code, party_id, sessionId);
    if (!session) throw new NotFoundException(generateResponse(null, 2003, 'Session not found'));
    return generateResponse(this.transformSession(session), 1000, 'Success');
  }

  /** Mirrors `sessionHandler.js:putSession`. */
  async putSession(cpo: { id: number }, country_code: string, party_id: string, sessionId: string, dto: OcpiSessionPutDto) {
    if (dto.country_code !== country_code || dto.party_id !== party_id || dto.id !== sessionId) {
      throw new BadRequestException(generateResponse(null, 2000, 'Path parameters and body identifiers do not match'));
    }

    const existing = await this.repo.findTransaction(cpo.id, country_code, party_id, sessionId);
    const sessionData = {
      country_code: dto.country_code,
      party_id: dto.party_id,
      session_id: dto.id,
      start_date_time: dto.start_date_time,
      end_date_time: dto.end_date_time || null,
      kwh: Number(dto.kwh) || 0,
      cdr_token: dto.cdr_token as any,
      auth_method: dto.auth_method || 'COMMAND',
      authorization_reference: dto.authorization_reference || null,
      location_id: dto.location_id,
      evse_uid: dto.evse_uid,
      connector_id: dto.connector_id,
      meter_id: null,
      currency: dto.currency,
      charging_periods: (dto.charging_periods as any) || [],
      total_cost: dto.total_cost as any,
      price: dto.total_cost.excl_vat,
      tax: dto.total_cost.vat ?? dto.total_cost.incl_vat - dto.total_cost.excl_vat,
      total_price: dto.total_cost.incl_vat,
      status: dto.status || 'PENDING',
      last_updated: dto.last_updated || new Date().toISOString(),
    };

    let transaction;
    if (existing) {
      transaction = await this.repo.updateTransaction(existing.id, sessionData);
    } else {
      transaction = await this.repo.createTransaction({ ...sessionData, cpo_id: cpo.id });

      const cpoSession = dto.authorization_reference
        ? await this.repo.findCpoSessionBySessionId(dto.authorization_reference)
        : null;

      if (cpoSession) {
        await this.repo.updateTransaction(transaction.id, { user_id: cpoSession.user_id, evse_id: cpoSession.evse_id });
        await this.repo.updateCpoSession(cpoSession.id, { status: 'ACTIVE', transactionId: transaction.id });

        // Mirrors legacy `ImportEmsp/sessionHandler.js`'s `io.to(transaction.authorization_reference).emit('started', { session_id })`
        const authRef = transaction.authorization_reference;
        if (authRef) {
          this.realtimeService.emitToRoom(authRef, 'started', { session_id: authRef });
        }
      }
    }

    return generateResponse('ACCEPTED', 1000, 'Success');
  }

  /** Mirrors `sessionHandler.js:patchCpoSession`. */
  async patchSession(cpo: { id: number }, country_code: string, party_id: string, sessionId: string, dto: OcpiSessionPatchDto) {
    const session = await this.repo.findTransaction(cpo.id, country_code, party_id, sessionId);
    if (!session) throw new NotFoundException(generateResponse(null, 2003, 'Session not found'));

    const updateFields: Record<string, unknown> = {};
    if (dto.kwh !== undefined) updateFields.kwh = Number(dto.kwh);
    if (dto.status !== undefined) updateFields.status = dto.status;
    if (dto.end_date_time !== undefined) updateFields.end_date_time = dto.end_date_time;
    if (dto.charging_periods !== undefined) updateFields.charging_periods = dto.charging_periods as any;
    if (dto.total_cost !== undefined) {
      updateFields.total_cost = dto.total_cost as any;
      updateFields.price = dto.total_cost.excl_vat;
      updateFields.tax = dto.total_cost.vat ?? dto.total_cost.incl_vat - dto.total_cost.excl_vat;
      updateFields.total_price = dto.total_cost.incl_vat;
    }
    updateFields.last_updated = new Date().toISOString();

    await this.repo.updateTransaction(session.id, updateFields as any);

    if (dto.status === 'ACTIVE' && session.authorization_reference) {
      const initiatedSession = await this.repo.findCpoSessionBySessionId(session.authorization_reference);
      if (initiatedSession && dto.kwh !== undefined) {
        await this.repo.updateCpoSession(initiatedSession.id, { total_kwh: Number(dto.kwh) });
      }
    }

    // Mirrors legacy `ImportEmsp/sessionHandler.js`'s `io.to(session.authorization_reference).emit('meterValue', {})`
    if (session.authorization_reference) {
      this.realtimeService.emitToRoom(session.authorization_reference, 'meterValue', {});
    }

    return generateResponse('ACCEPTED', 1000, 'Success');
  }

  private transformSession(session: any) {
    return {
      country_code: session.country_code,
      party_id: session.party_id,
      id: session.session_id,
      start_date_time: session.start_date_time,
      end_date_time: session.end_date_time,
      kwh: session.kwh,
      cdr_token: session.cdr_token,
      auth_method: session.auth_method,
      authorization_reference: session.authorization_reference,
      meter_id: session.meter_id,
      location_id: session.location_id,
      evse_uid: session.evse_uid,
      connector_id: session.connector_id,
      currency: session.currency,
      charging_periods: session.charging_periods,
      total_cost: session.total_cost,
      status: session.status,
      last_updated: session.last_updated,
    };
  }

  // ---- CDRs ----

  /** Mirrors `cdrHandler.js:getCdrById`. */
  async getCdrById(cdrId: string) {
    const cdr = await this.repo.findCdrByCdrId(cdrId);
    if (!cdr) throw new NotFoundException(generateResponse(null, 2001, 'CDR not found'));

    const ocpiCdr = {
      country_code: cdr.country_code,
      party_id: cdr.party_id,
      id: cdr.cdr_id,
      start_date_time: cdr.start_date_time,
      end_date_time: cdr.end_date_time,
      session_id: cdr.session_id,
      cdr_token: cdr.cdr_token,
      auth_method: cdr.auth_method,
      authorization_reference: cdr.authorization_reference,
      cdr_location: cdr.cdr_location,
      meter_id: cdr.meter_id,
      currency: cdr.currency,
      tariffs: cdr.tariffs,
      charging_periods: cdr.charging_periods,
      signed_data: cdr.signed_data ?? null,
      total_cost: cdr.total_cost ?? null,
      total_fixed_cost: cdr.total_fixed_cost ?? null,
      total_energy: cdr.total_energy ?? null,
      total_energy_cost: cdr.total_energy_cost ?? null,
      total_time: cdr.total_time ?? null,
      total_time_cost: cdr.total_time_cost ?? null,
      total_parking_time: cdr.total_parking_time ?? null,
      total_parking_cost: cdr.total_parking_cost ?? null,
      total_reservation_cost: cdr.total_reservation_cost ?? null,
      remark: cdr.remark ?? null,
      invoice_reference_id: cdr.invoice_reference_id ?? null,
      credit: cdr.credit ?? false,
      credit_reference_id: cdr.credit_reference_id ?? null,
      home_charging_compensation: cdr.home_charging_compensation ?? null,
      last_updated: cdr.last_updated ?? null,
    };

    return generateResponse(ocpiCdr, 1000, 'Success');
  }

  /** Mirrors `cdrHandler.js:createCdr`, including the wallet debit for the roamed session's user. */
  async createCdr(cpo: { id: number; clientId: number }, body: OcpiCdrPostDto) {
    const existing = await this.repo.findCdrByCdrIdCountryParty(body.id, body.country_code, body.party_id, cpo.id);
    if (existing) throw new BadRequestException(generateResponse('FAILED', 2000, 'CDR already exists'));

    if (body.credit && !body.credit_reference_id) {
      throw new BadRequestException(generateResponse('FAILED', 2000, 'Credit CDR must have credit_reference_id'));
    }

    await this.repo.createCdr({
      cpo_id: cpo.id,
      country_code: body.country_code,
      party_id: body.party_id,
      cdr_id: body.id,
      start_date_time: new Date(body.start_date_time),
      end_date_time: new Date(body.end_date_time),
      session_id: body.session_id,
      cdr_token: body.cdr_token,
      auth_method: body.auth_method as any,
      authorization_reference: body.authorization_reference,
      cdr_location: body.cdr_location,
      meter_id: body.meter_id ?? null,
      currency: body.currency,
      tariffs: body.tariffs,
      charging_periods: body.charging_periods,
      signed_data: body.signed_data ?? null,
      total_cost: body.total_cost,
      total_fixed_cost: body.total_fixed_cost ?? null,
      total_energy: body.total_energy ?? 0,
      total_energy_cost: body.total_energy_cost ?? null,
      total_time: body.total_time,
      total_time_cost: body.total_time_cost ?? null,
      total_parking_time: body.total_parking_time ?? null,
      total_parking_cost: body.total_parking_cost ?? null,
      total_reservation_cost: body.total_reservation_cost ?? null,
      remark: body.remark ?? null,
      invoice_reference_id: body.invoice_reference_id ?? null,
      credit: body.credit ?? null,
      credit_reference_id: body.credit_reference_id ?? null,
      home_charging_compensation: body.home_charging_compensation ?? null,
      last_updated: new Date(body.last_updated),
    });

    if (body.authorization_reference) {
      const cpoSession = await this.repo.findCpoSessionBySessionId(body.authorization_reference);
      if (cpoSession) {
        const totalAmount = body.total_cost.incl_vat;
        await this.repo.updateCpoSession(cpoSession.id, {
          status: 'COMPLETED',
          total_kwh: body.total_energy,
          total_amount: totalAmount,
          price: body.total_cost.excl_vat,
          tax: body.total_cost.vat ?? body.total_cost.incl_vat - body.total_cost.excl_vat,
        });

        if (cpoSession.user_id) {
          await this.repo.debitUserWalletForCpoSession(cpoSession.user_id, cpo.clientId, totalAmount, body.authorization_reference);
        }
      }
    }

    return generateResponse('ACCEPTED', 1000, 'Success');
  }

  // ---- Commands (callback from the CPO with the async result) ----

  /** Mirrors `commandsHandler.js:startCommandResponse`. */
  async handleStartCommandResult(cpo: { id: number }, sessionId: string, result: string, message: unknown) {
    if (!result || !message) throw new BadRequestException(generateResponse(null, 2000, 'Invalid command'));

    const session = await this.repo.findCpoSessionBySessionId(sessionId);
    if (session) {
      await this.repo.updateCpoSession(session.id, { status: result === 'ACCEPTED' ? 'ACCEPTED' : 'REJECTED' });

      // Mirrors legacy `ImportEmsp/commandsHandler.js` — ACCEPTED -> StartTransaction, REJECTED -> StopTransaction
      this.realtimeService.emitToRoom(
        sessionId,
        result === 'ACCEPTED' ? 'StartTransaction' : 'StopTransaction',
        sessionId,
      );
    }
    return generateResponse(message, 1000, 'Success');
  }

  /** Mirrors `commandsHandler.js:stopCommandResponse`. */
  async handleStopCommandResult(cpo: { id: number }, sessionId: string, result: string, message: unknown) {
    if (result === 'ACCEPTED') {
      const transaction = await this.repo.findTransactionBySessionId(sessionId);
      if (transaction) {
        await this.repo.updateTransaction(transaction.id, { status: 'COMPLETED' });

        // Mirrors legacy `ImportEmsp/commandsHandler.js`'s `io.to(session.authorization_reference).emit('StopTransaction', {})`
        if (transaction.authorization_reference) {
          this.realtimeService.emitToRoom(transaction.authorization_reference, 'StopTransaction', {});
        }
      }
    }
    return generateResponse(message, 1000, 'Success');
  }
}
