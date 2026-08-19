import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FleetUserDetail } from '../../../fleet/src/entities/fleet-user-detail.entity';
import { Wallet } from '../../../wallet/src/entities/wallet.entity';
import { DeviceTransaction } from '../../../sessions/src/entities/device-transaction.entity';

/** Mirrors the fleet-specific data access needed by `controllers/ocpp/RemoteStartController.js:fleetUserHandleRemoteStart` + `RemoteStopController.js:fleetHandleRemoteStop`. */
@Injectable()
export class FleetRemoteControlRepository {
  constructor(
    @InjectRepository(FleetUserDetail) private readonly fleetUserDetailRepo: Repository<FleetUserDetail>,
    @InjectRepository(Wallet) private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(DeviceTransaction) private readonly deviceTransactionRepo: Repository<DeviceTransaction>,
  ) {}

  findFleetWithVendorUserTypes(fleetId: number, clientId: number, fleetGroupId: number | undefined, vendorId: number | null) {
    const qb = this.fleetUserDetailRepo
      .createQueryBuilder('fud')
      .select(['fud.id', 'fud.fleetUId'])
      .where('fud.id = :fleetId', { fleetId })
      .andWhere('fud.clientId = :clientId', { clientId });

    if (fleetGroupId) {
      qb.leftJoin('fud.fleetVehicleGroups', 'fleetVehicleGroups', 'fleetVehicleGroups.id = :fleetGroupId', { fleetGroupId })
        .addSelect(['fleetVehicleGroups.id', 'fleetVehicleGroups.name'])
        .leftJoin('fleetVehicleGroups.vendorUserTypes', 'vendorUserTypes', 'vendorUserTypes.vendorId = :vendorId', { vendorId })
        .addSelect(['vendorUserTypes.id'])
        .leftJoin('vendorUserTypes.userType', 'userType')
        .addSelect(['userType.id', 'userType.name', 'userType.startDate', 'userType.endDate']);
    }

    return qb.getRawOne();
  }

  findFleetWallet(fleetId: number) {
    return this.walletRepo.findOne({ where: { fleetId, type: 'Fleet' }, select: { id: true, balance: true } });
  }

  async sumRunningMaxAmountByFleet(fleetId: number): Promise<number> {
    const raw = await this.deviceTransactionRepo
      .createQueryBuilder('dt')
      .select('SUM(dt.maxAmount)', 'total')
      .where('dt.fleetId = :fleetId AND dt.status = 0', { fleetId })
      .getRawOne<{ total: string | null }>();
    return Number(raw?.total) || 0;
  }

  /** Mirrors legacy's transaction lookup for stop — no clientId scope (matches legacy exactly). */
  findRunningTransactionByTransactionIdUnscoped(transactionId: number) {
    return this.deviceTransactionRepo.findOne({ where: { transactionId, status: 0 } });
  }
}
