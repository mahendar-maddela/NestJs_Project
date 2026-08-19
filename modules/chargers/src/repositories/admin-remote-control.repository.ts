import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { Charger } from '../entities/charger.entity';
import { Connector } from '../entities/connector.entity';
import { ChargingSession } from '../../../sessions/src/entities/charging-session.entity';
import { DeviceTransaction } from '../../../sessions/src/entities/device-transaction.entity';
import { Wallet } from '../../../wallet/src/entities/wallet.entity';
import { Tariff } from '../../../tariffs/src/entities/tariff.entity';
import { User } from '../../../users/src/entities/user.entity';
import { VendorUser } from '../../../vendors/src/entities/vendor-user.entity';
import { UserType } from '../../../vendors/src/entities/user-type.entity';
import { PrefixConfig } from '../../../clients/src/entities/prefix-config.entity';
import { ClientDetails } from '../../../clients/src/entities/client-details.entity';

@Injectable()
export class AdminRemoteControlRepository {
  constructor(
    @InjectRepository(Charger) private readonly chargerRepo: Repository<Charger>,
    @InjectRepository(Connector) private readonly connectorRepo: Repository<Connector>,
    @InjectRepository(ChargingSession) private readonly chargingSessionRepo: Repository<ChargingSession>,
    @InjectRepository(DeviceTransaction) private readonly deviceTransactionRepo: Repository<DeviceTransaction>,
    @InjectRepository(Wallet) private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(Tariff) private readonly tariffRepo: Repository<Tariff>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(VendorUser) private readonly vendorUserRepo: Repository<VendorUser>,
    @InjectRepository(UserType) private readonly userTypeRepo: Repository<UserType>,
    @InjectRepository(PrefixConfig) private readonly prefixConfigRepo: Repository<PrefixConfig>,
    @InjectRepository(ClientDetails) private readonly clientDetailsRepo: Repository<ClientDetails>,
  ) {}

  findChargerByChargerId(chargerId: string) {
    return this.chargerRepo.findOne({
      where: { chargerId },
      select: { id: true, chargerId: true, powerType: true, vendorId: true, stationId: true, clientId: true },
      relations: { station: true },
    });
  }

  async findUserByUserIdAndVendor(userId: string, clientId: number, vendorId: number | null) {
    const user = await this.userRepo.findOne({ where: { userId, clientId }, select: { id: true, userId: true } });
    if (!user) return null;

    const vendorUsers = await this.vendorUserRepo.find({
      where: { userId: user.id, ...(vendorId ? { vendorId } : {}) },
      relations: { userType: true },
    });

    return { ...user, vendorUserTypes: vendorUsers };
  }

  findWalletByUser(userId: number) {
    return this.walletRepo.findOne({ where: { userId, type: 'User' }, select: { id: true, balance: true } });
  }

  findConnector(chargerRef: number, connectorId: string) {
    return this.connectorRepo.findOne({ where: { chargerId: chargerRef, connectorId } });
  }

  findRunningDeviceTransaction(chargerId: string, connectorId: string) {
    return this.deviceTransactionRepo.findOne({ where: { chargerId, connectorId, status: 0 }, select: { id: true } });
  }

  async sumRunningMaxAmountByUser(userId: number): Promise<number> {
    const raw = await this.deviceTransactionRepo
      .createQueryBuilder('dt')
      .select('SUM(dt.maxAmount)', 'total')
      .where('dt.userId = :userId AND dt.status = 0', { userId })
      .getRawOne<{ total: string | null }>();
    return Number(raw?.total) || 0;
  }

  findActiveSession(chargerId: string, connectorId: string) {
    // ChargingSession.connectorId is INTEGER in the legacy schema (unlike Connector/DeviceTransaction, both STRING).
    return this.chargingSessionRepo.findOne({ where: { chargerId, connectorId: Number(connectorId), status: In(['Initiated', 'Started']) } });
  }

  findTariff(vendorId: number | null, chargerRef: number, userTypeId: number | null) {
    return this.tariffRepo.findOne({
      where: {
        vendorId: vendorId === null ? IsNull() : vendorId,
        chargerId: chargerRef,
        userTypeId: userTypeId === null ? IsNull() : userTypeId,
      },
    });
  }

  findUserType(id: number) {
    return this.userTypeRepo.findOne({ where: { id } });
  }

  findClientDetails(clientId: number) {
    return this.clientDetailsRepo.findOne({ where: { clientId }, select: { id: true, clientId: true, preConvDeductionAmount: true } });
  }

  findPrefixConfig(clientId: number) {
    return this.prefixConfigRepo.findOne({ where: { clientId }, select: { id: true, clientId: true, session: true } });
  }

  createChargingSession(data: Partial<ChargingSession>) {
    const session = this.chargingSessionRepo.create({
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    });
    return this.chargingSessionRepo.save(session);
  }

  findRunningTransactionByTransactionId(transactionId: number, clientId: number) {
    return this.deviceTransactionRepo.findOne({ where: { transactionId, status: 0, clientId } });
  }

  findStartedSessionByTransactionRef(transactionRef: number) {
    return this.chargingSessionRepo.findOne({ where: { transactionId: transactionRef, status: 'Started' } });
  }

  async updateDeviceTransactionStopFrom(id: number, stopFrom: string, stopDriverId?: number) {
    await this.deviceTransactionRepo.update(id, { stopFrom, ...(stopDriverId ? { stopDriverId } : {}) } as any);
  }

  async updateChargingSessionStopFrom(id: number, stopFrom: string, stopDriverId?: number) {
    await this.chargingSessionRepo.update(id, { stopFrom, ...(stopDriverId ? { stopDriverId } : {}) } as any);
  }
}
