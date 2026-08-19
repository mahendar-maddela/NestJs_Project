import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { amountToEnergyConversion } from '@app/common';
import { AdminRemoteControlRepository } from '../repositories/admin-remote-control.repository';
import { AdminRemoteControlService } from './admin-remote-control.service';
import { UserRemoteControlRepository } from '../repositories/user-remote-control.repository';
import { ChargerCommandService } from './charger-command.service';
import { UserRemoteStartDto, UserRemoteStopDto } from '../dto/user-remote-control.dto';
import { AdminRemoteStopDto } from '../dto/admin-remote-control.dto';

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

/** Mirrors `controllers/ocpp/RemoteStartController.js:handleRemoteStart`. Shared by the web and app (driver) actors. `handleRemoteStop` is identical to the admin flow and is served by `AdminRemoteControlService.handleRemoteStop` directly. */
@Injectable()
export class UserRemoteControlService {
  constructor(
    private readonly repo: AdminRemoteControlRepository,
    private readonly adminRemoteControlService: AdminRemoteControlService,
    private readonly userRepo: UserRemoteControlRepository,
    private readonly chargerCommandService: ChargerCommandService,
  ) {}

  async handleRemoteStart(userId: number, chargerId: string, clientId: number, platform: string | undefined, dto: UserRemoteStartDto) {
    if (!dto.connectorId) {
      throw new BadRequestException({ success: false, message: 'Please select connector' });
    }
    if (!platform) {
      throw new BadRequestException({ success: false, message: 'Platform parameter is required' });
    }
    if (!dto.amount || dto.amount <= 0) {
      throw new BadRequestException({ success: false, message: 'Amount should be greater than zero' });
    }
    // if (!dto.energy) {
    //   throw new BadRequestException({ success: false, message: 'Energy is required' });
    // }

    const charger = await this.repo.findChargerByChargerId(chargerId);
    if (!charger) {
      throw new NotFoundException({ success: false, message: 'Charger not found' });
    }

    const user = await this.userRepo.findUserWithVendorUserTypes(userId, charger.vendorId);
    if (!user) {
      throw new NotFoundException({ success: false, message: 'User not found' });
    }

    const userBalance = await this.userRepo.findUserWallet(user.id);
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

    const connected = await this.chargerCommandService.isChargerConnected(chargerId);
    if (!connected) {
      throw new BadRequestException({ success: false, message: 'Charger is currently unavailable' });
    }

    const activeSession = await this.repo.findActiveSession(chargerId, dto.connectorId);
    if (activeSession) {
      throw new BadRequestException({ success: false, message: 'Another charging session is in progress' });
    }

    const isRoaming = charger.clientId !== clientId;
    let requiredPrice: any = null;
    let tariffType: any = null;

    if (isRoaming) {
      requiredPrice = await this.userRepo.findRoamingTariff(charger.id, charger.clientId, clientId);
    } else {
      let activeUserType: any = null;
      const ut = (user as any).vendorUserTypes?.[0]?.userType;
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
    }

    if (!requiredPrice) {
      throw new BadRequestException({ success: false, message: 'No matching tariff price type found for user' });
    }

    if (!isRoaming && requiredPrice.userTypeId) {
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
      userId: user.id,
      maxEnergy: energyCalc || dto.energy,
      maxAmount: finalUsableAmount,
      connectorId: Number(dto.connectorId),
      chargerId,
      chargerRef: charger.id,
      platform: (isRoaming ? 'ROAMING' : platform) as any,
      calcTaxPercent: requiredPrice.gst || 0,
      calcPrice: requiredPrice.price || 0,
      tariffName: isRoaming ? 'ROAMING' : tariffType ? tariffType.name : 'Standard',
      clientId: charger.clientId,
      initiatedClientId: charger.clientId === clientId ? null : clientId,
      maxChargingPercentage: dto.percentage || null,
      startFrom: platform as any,
    } as any);

    this.chargerCommandService.sendFireAndForgetCommand(chargerId, 'RemoteStartTransaction', { connectorId: dto.connectorId, idTag: sessionId }).catch(() => undefined);

    return { success: true, message: 'Remote start initiated successfully', data: sessionId };
  }

  /** Identical to the admin flow — delegates directly rather than duplicating it. */
  async handleRemoteStop(chargerId: string, clientId: number, platform: string | undefined, dto: UserRemoteStopDto) {
    return this.adminRemoteControlService.handleRemoteStop(chargerId, clientId, platform, dto as AdminRemoteStopDto);
  }
}
