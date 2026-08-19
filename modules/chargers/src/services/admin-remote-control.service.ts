import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { amountToEnergyConversion } from '@app/common';
import { AdminRemoteControlRepository } from '../repositories/admin-remote-control.repository';
import { ChargerCommandService } from './charger-command.service';
import { AdminRemoteStartDto, AdminRemoteStopDto } from '../dto/admin-remote-control.dto';

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

/** Mirrors `controllers/ocpp/RemoteStartController.js:adminHandleRemoteStart` + `RemoteStopController.js:handleRemoteStop`. */
@Injectable()
export class AdminRemoteControlService {
  constructor(
    private readonly repo: AdminRemoteControlRepository,
    private readonly chargerCommandService: ChargerCommandService,
  ) {}

  async adminHandleRemoteStart(chargerId: string, clientId: number, platform: string | undefined, dto: AdminRemoteStartDto) {
    console.log("daskldklasndk",dto)
    if (!dto.connectorId) {
      throw new BadRequestException({ success: false, message: 'Please select connector' });
    }
    if (!platform) {
      throw new BadRequestException({ success: false, message: 'Platform parameter is required' });
    }
    if (!dto.amount || dto.amount <= 0) {
      throw new BadRequestException({ success: false, message: 'Amount should be greater than zero' });
    }

    const charger = await this.repo.findChargerByChargerId(chargerId);
    if (!charger) {
      throw new NotFoundException({ success: false, message: 'Charger not found' });
    }

    const user = await this.repo.findUserByUserIdAndVendor(dto.userId, clientId, charger.vendorId);
    if (!user) {
      throw new NotFoundException({ success: false, message: 'User not found' });
    }

    const userBalance = await this.repo.findWalletByUser(user.id);
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
      this.repo.findRunningDeviceTransaction(chargerId, dto.connectorId),
      this.repo.sumRunningMaxAmountByUser(user.id),
    ]);

    if (runningDevice) {
      throw new BadRequestException({ success: false, message: 'Device is already running' });
    }

    const totalUsed = exhaustedAmount || 0;
    if ((userBalance.balance ?? 0) - totalUsed < requestedAmount) {
      throw new BadRequestException({ success: false, message: 'Insufficient balance in the wallet, another session is going on' });
    }

    const activeSession = await this.repo.findActiveSession(chargerId, dto.connectorId);
    if (activeSession) {
      throw new BadRequestException({ success: false, message: 'Another charging session is in progress' });
    }

    let requiredPrice: any = null;
    let activeUserType: any = null;

    const vu = user.vendorUserTypes?.[0];
    const ut = vu?.userType;

    if (ut) {
      const today = toDateOnly(new Date());
      const start = toDateOnly(ut.startDate);
      const end = toDateOnly(ut.endDate);
      if ((!start || today! >= start) && (!end || today! <= end)) {
        activeUserType = ut;
      }
    }

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

    const gst = requiredPrice.gst || 0;
    const pricePerKw = requiredPrice.price;

    const clientDetails = await this.repo.findClientDetails(charger.clientId);
    const deduction = clientDetails?.preConvDeductionAmount || 0;
    const finalUsableAmount = deduction > 0 ? dto.amount - deduction : dto.amount;

    if (finalUsableAmount <= 0) {
      throw new BadRequestException({ success: false, message: `Please add more than ₹${deduction} to continue.` });
    }

    const energyCalc = amountToEnergyConversion(finalUsableAmount, gst, pricePerKw, true);

    let tariffType: any = null;
    if (requiredPrice.userTypeId) {
      tariffType = await this.repo.findUserType(requiredPrice.userTypeId);
    }

    const prefixConfigValue = await this.repo.findPrefixConfig(charger.clientId);
    const sessionId = `${prefixConfigValue?.session ?? ''}${randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()}`;

    const session = await this.repo.createChargingSession({
      sessionId,
      status: 'Initiated',
      userId: user.id,
      maxEnergy: energyCalc || dto.energy,
      maxAmount: finalUsableAmount,
      connectorId: Number(dto.connectorId),
      chargerId,
      chargerRef: charger.id,
      platform: platform as any,
      calcTaxPercent: requiredPrice.gst || 0,
      calcPrice: requiredPrice.price || 0,
      tariffName: tariffType ? tariffType.name : 'Standard',
      clientId: charger.clientId,
      initiatedClientId: charger.clientId === clientId ? null : clientId,
    });

    // Fire-and-forget: legacy does not await the charger's RemoteStartTransaction.conf here.
    this.chargerCommandService
      .sendFireAndForgetCommand(chargerId, 'RemoteStartTransaction', { connectorId: dto.connectorId, idTag: sessionId })
      .catch(() => undefined);

    return { success: true, message: 'Remote start initiated successfully', data: session };
  }

  async handleRemoteStop(chargerId: string, clientId: number, platform: string | undefined, dto: AdminRemoteStopDto) {
    if (!dto.transactionId) {
      throw new BadRequestException({ success: false, message: 'Transaction Id  is required' });
    }
    if (!platform) {
      throw new BadRequestException({ success: false, message: 'Platform parameter is required' });
    }

    // Legacy checks charger reachability before touching any DB state — preserved so a session/
    // transaction never gets marked stopFrom without the OCPP command actually going out.
    const connected = await this.chargerCommandService.isChargerConnected(chargerId);
    if (!connected) {
      throw new NotFoundException({ success: false, message: 'Charger is Not Available at the moment.' });
    }

    const transaction = await this.repo.findRunningTransactionByTransactionId(dto.transactionId, clientId);
    if (!transaction) {
      throw new NotFoundException({ success: false, message: 'the transaction has already been stopped. or not found' });
    }

    const session = await this.repo.findStartedSessionByTransactionRef(transaction.id);

    await this.repo.updateDeviceTransactionStopFrom(transaction.id, platform);
    if (session) {
      await this.repo.updateChargingSessionStopFrom(session.id, platform);
    }

    await this.chargerCommandService.sendFireAndForgetCommand(chargerId, 'RemoteStopTransaction', {
      transactionId: transaction.transactionId,
    });

    return { success: true, message: 'RemoteStopTransaction sent successfully', data: { ...session, stopFrom: platform } };
  }
}
