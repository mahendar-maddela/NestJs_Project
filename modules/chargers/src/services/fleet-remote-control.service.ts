import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { amountToEnergyConversion } from '@app/common';
import { AdminRemoteControlRepository } from '../repositories/admin-remote-control.repository';
import { FleetRemoteControlRepository } from '../repositories/fleet-remote-control.repository';
import { ChargerCommandService } from './charger-command.service';
import { FleetRemoteStartDto, FleetRemoteStopDto } from '../dto/fleet-remote-control.dto';

const DC_ALLOWED_PORT_TYPES = ['Type 6', 'Type 7'];

const CONNECTOR_BLOCKED_MESSAGES: Record<string, string> = {
  Available: 'Please connect the charger to your EV before starting!',
  Charging: 'The connector is already engaged!',
  SuspendedEVSE: 'Please remove and reconnect the connector!',
  SuspendedEV: 'Please remove and reconnect the connector!',
  Finishing: 'The connector is already engaged!',
  Reserved: 'The connector is already engaged!',
  Unavailable: 'The connector is currently unavailable!',
  Faulted: 'The connector is currently unavailable!',
};

function toDateOnly(d: Date | string | null | undefined): number | null {
  return d ? new Date(d).setHours(0, 0, 0, 0) : null;
}

/** Mirrors `controllers/ocpp/RemoteStartController.js:fleetUserHandleRemoteStart` + `RemoteStopController.js:fleetHandleRemoteStop`. */
@Injectable()
export class FleetRemoteControlService {
  constructor(
    private readonly repo: AdminRemoteControlRepository,
    private readonly fleetRepo: FleetRemoteControlRepository,
    private readonly chargerCommandService: ChargerCommandService,
  ) {}

  async fleetUserHandleRemoteStart(fleetUserId: number, fleetId: number, clientId: number, platform: string | undefined, dto: FleetRemoteStartDto) {
    if (!dto.connectorId) {
      throw new BadRequestException({ success: false, message: 'Please select connector' });
    }
    if (!platform) {
      throw new BadRequestException({ success: false, message: 'Platform parameter is required' });
    }
    if (!dto.amount || dto.amount <= 0) {
      throw new BadRequestException({ success: false, message: 'Amount should be greater than zero' });
    }

    const charger = await this.repo.findChargerByChargerId(dto.chargerId);
    if (!charger) {
      throw new NotFoundException({ success: false, message: 'Charger not found' });
    }

    const fleet = await this.fleetRepo.findFleetWithVendorUserTypes(fleetId, clientId, dto.fleetGroupId, charger.vendorId);
    if (!fleet) {
      throw new NotFoundException({ success: false, message: 'User not found' });
    }

    const userBalance = await this.fleetRepo.findFleetWallet(fleet.id);
    if (!userBalance) {
      throw new BadRequestException({ success: false, message: 'User wallet not found' });
    }

    const connector = await this.repo.findConnector(charger.id, dto.connectorId);
    if (!connector) {
      throw new NotFoundException({ success: false, message: 'Connector not found' });
    }

    const isDC = charger.powerType !== 'AC';
    if (isDC && !DC_ALLOWED_PORT_TYPES.includes(connector.portType ?? '')) {
      const msg = CONNECTOR_BLOCKED_MESSAGES[connector.status];
      if (msg) {
        throw new BadRequestException({ success: false, message: msg });
      }
    }

    const requestedAmount = parseFloat(String(dto.amount));
    if ((userBalance.balance ?? 0) < requestedAmount) {
      throw new BadRequestException({ success: false, message: 'Insufficient balance' });
    }

    const [runningDevice, exhaustedAmount] = await Promise.all([
      this.repo.findRunningDeviceTransaction(dto.chargerId, dto.connectorId),
      this.fleetRepo.sumRunningMaxAmountByFleet(fleet.id),
    ]);

    if (runningDevice) {
      throw new BadRequestException({ success: false, message: 'Device is already running' });
    }

    const totalUsed = exhaustedAmount || 0;
    if ((userBalance.balance ?? 0) - totalUsed < requestedAmount) {
      throw new BadRequestException({ success: false, message: 'Insufficient balance in the wallet, another session is going on' });
    }

    const connected = await this.chargerCommandService.isChargerConnected(dto.chargerId);
    if (!connected) {
      throw new BadRequestException({ success: false, message: 'Charger is currently unavailable' });
    }

    const activeSession = await this.repo.findActiveSession(dto.chargerId, dto.connectorId);
    if (activeSession) {
      throw new BadRequestException({ success: false, message: 'Another charging session is in progress' });
    }

    let activeUserType: any = null;
    const ut = (fleet as any).fleetVehicleGroups?.[0]?.vendorUserTypes?.[0]?.userType;
    if (ut) {
      const today = toDateOnly(new Date());
      const start = toDateOnly(ut.startDate);
      const end = toDateOnly(ut.endDate);
      if ((!start || today! >= start) && (!end || today! <= end)) {
        activeUserType = ut;
      }
    }

    let requiredPrice: any = null;
    if (activeUserType) {
      requiredPrice = await this.repo.findTariff(charger.vendorId, charger.id, activeUserType.id);
      if (!requiredPrice) {
        requiredPrice = await this.repo.findTariff(charger.vendorId, charger.id, null);
      }
    } else {
      requiredPrice = await this.repo.findTariff(charger.vendorId, charger.id, null);
    }

    if (!requiredPrice) {
      throw new BadRequestException({ success: false, message: 'No matching tariff price type found for user' });
    }

    let tariffType: any = null;
    if (requiredPrice.userTypeId) {
      tariffType = await this.repo.findUserType(requiredPrice.userTypeId);
    }

    const gst = requiredPrice.gst || 0;
    const pricePerKw = requiredPrice.price;

    const clientDetails = await this.repo.findClientDetails(charger.clientId);
    const deduction = clientDetails?.preConvDeductionAmount || 0;
    const finalUsableAmount = deduction > 0 ? dto.amount - deduction : dto.amount;

    if (finalUsableAmount <= 0) {
      throw new BadRequestException({ success: false, message: `Please add more than ₹${deduction} to continue.` });
    }

    const energyCalc = amountToEnergyConversion(finalUsableAmount, gst, pricePerKw, true);

    const prefixConfigValue = await this.repo.findPrefixConfig(charger.clientId);
    const sessionId = `${prefixConfigValue?.session ?? ''}${randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()}`;

    const session = await this.repo.createChargingSession({
      sessionId,
      status: 'Initiated',
      fleetId: fleet.id,
      maxEnergy: energyCalc || dto.energy,
      maxAmount: finalUsableAmount,
      connectorId: Number(dto.connectorId),
      chargerId: dto.chargerId,
      chargerRef: charger.id,
      platform: platform as any,
      calcTaxPercent: requiredPrice.gst || 0,
      calcPrice: requiredPrice.price || 0,
      startDriverId: fleetUserId,
      tariffName: tariffType ? tariffType.name : 'Standard',
      clientId: charger.clientId,
      initiatedClientId: charger.clientId === clientId ? null : clientId,
    } as any);

    this.chargerCommandService.sendFireAndForgetCommand(dto.chargerId, 'RemoteStartTransaction', { connectorId: dto.connectorId, idTag: sessionId }).catch(() => undefined);

    return { success: true, message: 'Remote start initiated successfully', data: session };
  }

  async fleetHandleRemoteStop(stopDriverId: number, platform: string | undefined, dto: FleetRemoteStopDto) {
    if (!dto.transactionId) {
      throw new BadRequestException({ success: false, message: 'Transaction Id  is required' });
    }
    if (!dto.chargerId) {
      throw new BadRequestException({ success: false, message: 'Charger Id  is required' });
    }
    if (!platform) {
      throw new BadRequestException({ success: false, message: 'Platform parameter is required' });
    }

    const connected = await this.chargerCommandService.isChargerConnected(dto.chargerId);
    if (!connected) {
      throw new NotFoundException({ success: false, message: 'Charger is Not Available at the moment.' });
    }

    const transaction = await this.fleetRepo.findRunningTransactionByTransactionIdUnscoped(dto.transactionId);
    if (!transaction) {
      throw new NotFoundException({ success: false, message: 'the transaction has already been stopped. or not found' });
    }

    const session = await this.repo.findStartedSessionByTransactionRef(transaction.id);

    await this.repo.updateDeviceTransactionStopFrom(transaction.id, platform, stopDriverId);
    if (session) {
      await this.repo.updateChargingSessionStopFrom(session.id, platform, stopDriverId);
    }

    await this.chargerCommandService.sendFireAndForgetCommand(dto.chargerId, 'RemoteStopTransaction', { transactionId: transaction.transactionId });

    return {
      success: true,
      message: 'Stop charging Initiated successfully , try to reload after 10 to 30 seconds .',
      data: { ...session, stopFrom: platform, stopDriverId },
    };
  }
}
