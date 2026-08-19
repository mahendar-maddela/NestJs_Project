import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { OcpiCpoPartnerRepository } from '../repositories/ocpi-cpo-partner.repository';
import { postMethodOcpi } from '../utils/ocpi-http.util';
import { encodeBase64 } from '../utils/ocpi-response.util';
import { OCPI_CONFIG, OCPI_CURR_VERSION, OCPI_IDENTIFIERS, OCPI_ROLES, OCPI_SERVER } from '../constants/ocpi.constants';
import { AppOcpiStartSessionDto, AppOcpiStopSessionDto } from '../dto/app-ocpi.dto';

/** Mirrors `controllers/APP/OCPI/commandController.js`. */
@Injectable()
export class AppOcpiCommandService {
  constructor(private readonly repo: OcpiCpoPartnerRepository) {}

  async ocpiStartSession(clientId: number, userId: number, dto: AppOcpiStartSessionDto) {
    const evseId = dto.charger_id;

    if (!dto.amount || Number(dto.amount) <= 0) {
      throw new BadRequestException({ success: false, message: 'Amount must be > 0' });
    }
    if (!evseId) {
      throw new BadRequestException({ success: false, message: 'Evse ID is required' });
    }
    if (!dto.connector_id) {
      throw new BadRequestException({ success: false, message: 'Connector ID is required' });
    }

    const evse = await this.repo.findEvseByUidGlobal(evseId);
    if (!evse) {
      throw new NotFoundException({ success: false, message: 'Evse not found' });
    }

    const existingSession = await this.repo.findActiveSessionByEvse(evseId);
    if (existingSession) {
      throw new NotFoundException({ success: false, message: 'Session already exists' });
    }

    const user = await this.repo.findUserById(userId);
    if (!user) {
      throw new NotFoundException({ success: false, message: 'User not found' });
    }

    const wallet = await this.repo.findUserWallet(user.id);
    if (!wallet) {
      throw new NotFoundException({ success: false, message: 'Wallet not found' });
    }

    const [deviceTransactions, cpoSessions] = await Promise.all([
      this.repo.findRunningDeviceTransactionAmountsByUser(userId),
      this.repo.findPendingCpoSessionAmountsByUser(userId),
    ]);

    let lockedAmount = 0;
    for (const t of deviceTransactions) lockedAmount += t.maxAmount || 0;
    for (const s of cpoSessions) lockedAmount += s.max_amount || 0;

    const availableBalance = (wallet.balance ?? 0) - lockedAmount;

    if (lockedAmount > 0 && availableBalance <= 0) {
      throw new BadRequestException({ success: false, message: 'Your wallet balance is already reserved for ongoing sessions' });
    }
    if (availableBalance < dto.amount) {
      throw new BadRequestException({ success: false, message: 'Insufficient available balance for this transaction' });
    }

    const connectors = (evse as any).connectors || [];
    const selectedConnector = dto.connector_id ? connectors.find((c: any) => c.connector_id === dto.connector_id) : connectors[0];
    if (!selectedConnector) {
      throw new BadRequestException({ success: false, message: 'Connector not found on EVSE' });
    }

    let tariffIds: string[] = [];
    try {
      const rawTariffs = selectedConnector.tariff_ids;
      if (Array.isArray(rawTariffs)) {
        tariffIds = rawTariffs;
      } else if (typeof rawTariffs === 'string' && rawTariffs.trim().length) {
        tariffIds = JSON.parse(rawTariffs);
      }
    } catch {
      throw new BadRequestException({ success: false, message: 'Invalid tariff_ids configuration on connector' });
    }

    if (!tariffIds.length) {
      throw new BadRequestException({ success: false, message: 'No tariff associated with connector' });
    }

    const tariff = await this.repo.findTariffByIdsAndParty(tariffIds, (evse as any).location?.party_id ?? undefined);
    if (!tariff) {
      throw new NotFoundException({ success: false, message: 'Tariff not found' });
    }

    let elements: any[] = [];
    try {
      elements = Array.isArray(tariff.elements) ? (tariff.elements as any[]) : JSON.parse((tariff.elements as any) || '[]');
    } catch {
      throw new BadRequestException({ success: false, message: 'Invalid tariff elements format' });
    }

    const energyElement = elements.find((el) => Array.isArray(el.price_components) && el.price_components.some((pc: any) => pc.type === 'ENERGY'));
    const energyComponent = energyElement ? energyElement.price_components.find((pc: any) => pc.type === 'ENERGY') : null;
    if (!energyComponent) {
      throw new BadRequestException({ success: false, message: 'ENERGY price component not defined in tariff' });
    }

    const unitPrice = Number(energyComponent.price) || 0;
    const vatPercent = Number(energyComponent.vat) || 0;
    const unitWithVat = unitPrice * (1 + vatPercent / 100);
    if (unitWithVat <= 0) {
      throw new BadRequestException({ success: false, message: 'Invalid tariff price configuration' });
    }

    const maxKwh = dto.amount / unitWithVat;
    const sessionId = uuidv4();
    const location = (evse as any).location;

    const newSession = await this.repo.createCpoSession({
      sessionId,
      evse_id: evse.id,
      evse_uid: evseId,
      max_amount: dto.amount,
      max_energy: Number(maxKwh.toFixed(2)),
      cpo_id: location.cpoId!,
      user_id: user.id,
      start_date: new Date(),
      end_date: new Date(),
      total_kwh: 0,
      status: 'PENDING',
      last_updated: new Date().toISOString(),
    } as any);

    const cpo = await this.repo.findCpoById(location.cpoId!);
    const version = cpo ? await this.repo.findVersion(cpo.id, OCPI_CURR_VERSION) : null;
    if (!cpo || !version) {
      await this.repo.updateCpoSession(newSession.id, { status: 'REJECTED' } as any);
      throw new NotFoundException({ success: false, message: `${!cpo ? 'CPO' : 'Version'} not found` });
    }

    const commandsEndpoint = await this.repo.findVersionEndpoint(version.id, OCPI_IDENTIFIERS.commands, OCPI_ROLES.receiver);
    if (!commandsEndpoint?.url) {
      await this.repo.updateCpoSession(newSession.id, { status: 'REJECTED' } as any);
      throw new NotFoundException({ success: false, message: 'Commands endpoint not found' });
    }

    const clientDetails = await this.repo.findClientDetails(clientId);
    const startUrl = `${OCPI_SERVER}/v1/ocpi/emsp/2.2.1/commands/START_SESSION/${sessionId}`;

    const ocpiCommandData = {
      response_url: startUrl,
      token: {
        country_code: OCPI_CONFIG.country_code,
        party_id: (clientDetails as any)?.partyId,
        uid: userId,
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
      location_id: location.locationId,
      evse_uid: evseId,
      connector_id: selectedConnector.connector_id,
    };

    const tokenB = encodeBase64(cpo.token_b);

    // Legacy responds before awaiting the CPO's command result — preserved as fire-and-forget below.
    const result = { success: true, message: 'Remote start initiated successfully', data: sessionId, type: 'OCPI' };

    postMethodOcpi<{ data: { result: string; timeout?: number } }>(`${commandsEndpoint.url}/START_SESSION`, ocpiCommandData, tokenB)
      .then(async (cpoRes) => {
        if (cpoRes.data?.data?.result !== 'ACCEPTED') {
          await this.repo.updateCpoSession(newSession.id, { status: 'REJECTED' } as any);
          return;
        }
        await this.repo.updateCpoSession(newSession.id, { timeout: cpoRes.data.data.timeout } as any);
      })
      .catch(async () => {
        await this.repo.updateCpoSession(newSession.id, { status: 'REJECTED' } as any);
      });

    return result;
  }

  async ocpiStopSession(clientId: number, dto: AppOcpiStopSessionDto) {
    const evse = await this.repo.findEvseByUidGlobal(dto.evseId);
    if (!evse) {
      throw new NotFoundException({ success: false, message: 'EVSE not found' });
    }

    const ocpiTransaction = await this.repo.findTransactionBySessionId(dto.session_id);
    if (!ocpiTransaction) {
      throw new NotFoundException({ success: false, message: 'OCPI Session not found' });
    }

    const session = ocpiTransaction.authorization_reference ? await this.repo.findCpoSessionBySessionId(ocpiTransaction.authorization_reference) : null;
    if (!session) {
      throw new NotFoundException({ success: false, message: 'Session not found' });
    }
    if (session.status !== 'ACTIVE') {
      throw new BadRequestException({ success: false, message: 'Session not active' });
    }

    const cpo = session.cpo_id != null ? await this.repo.findCpoById(session.cpo_id) : null;
    const version = cpo ? await this.repo.findVersion(cpo.id, OCPI_CURR_VERSION) : null;
    if (!cpo || !version) {
      throw new NotFoundException({ success: false, message: `${!cpo ? 'CPO' : 'Version'} not found` });
    }

    const commandsEndpoint = await this.repo.findVersionEndpoint(version.id, OCPI_IDENTIFIERS.commands, OCPI_ROLES.receiver);
    if (!commandsEndpoint?.url) {
      throw new NotFoundException({ success: false, message: 'Commands endpoint not found' });
    }

    const tokenB = encodeBase64(cpo.token_b);
    const responseUrl = `${OCPI_SERVER}/v1/ocpi/emsp/2.2.1/commands/STOP_SESSION/${dto.session_id}`;
    const commandData = { response_url: responseUrl, session_id: ocpiTransaction.session_id };

    const commandsResponse = await postMethodOcpi<{ data: { result: string } }>(`${commandsEndpoint.url}/STOP_SESSION`, commandData, tokenB);

    if (commandsResponse.data?.data?.result !== 'ACCEPTED') {
      throw new BadRequestException({ success: false, message: 'Invalid response from MSP' });
    }

    return { success: true, message: 'Session Stop Initiated Successfully', data: session };
  }
}
