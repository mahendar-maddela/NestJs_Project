import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { User } from '../../../users/src/entities/user.entity';
import { Wallet } from '../../../wallet/src/entities/wallet.entity';
import { PaymentTransaction } from '../../../payments/src/entities/payment-transaction.entity';
import { WalletTransaction } from '../../../wallet/src/entities/wallet-transaction.entity';
import { DeviceTransaction } from '../../../sessions/src/entities/device-transaction.entity';
import { RfidTag } from '../../../fleet/src/entities/rfid-tag.entity';
import { VendorUser } from '../../../vendors/src/entities/vendor-user.entity';
import { Vehicle } from '../../../users/src/entities/vehicle.entity';

@Injectable()
export class SuperAdminUserRepository {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Wallet) private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(PaymentTransaction) private readonly paymentTransactionRepo: Repository<PaymentTransaction>,
    @InjectRepository(WalletTransaction) private readonly walletTransactionRepo: Repository<WalletTransaction>,
    @InjectRepository(DeviceTransaction) private readonly deviceTransactionRepo: Repository<DeviceTransaction>,
    @InjectRepository(RfidTag) private readonly rfidTagRepo: Repository<RfidTag>,
    @InjectRepository(VendorUser) private readonly vendorUserRepo: Repository<VendorUser>,
    @InjectRepository(Vehicle) private readonly vehicleRepo: Repository<Vehicle>,
  ) {}

  findAllSimple() {
    return this.userRepo.find({
      select: { id: true, first_name: true, userId: true, createdAt: true, status: true, clientId: true },
      order: { id: 'DESC' },
    });
  }

  async findAndCountPaginated(clientId: number | undefined, search: string | undefined, skip: number, take: number) {
    const qb = this.userRepo
      .createQueryBuilder('u')
      .select(['u.id', 'u.first_name', 'u.userId', 'u.createdAt', 'u.status', 'u.phone', 'u.email'])
      .leftJoinAndSelect('u.wallet', 'wallet')
      .leftJoin('u.client', 'client')
      .addSelect(['client.id', 'client.first_name', 'client.last_name'])
      .leftJoin('client.clientDetails', 'clientDetails')
      .addSelect(['clientDetails.id', 'clientDetails.brandName']);

    if (clientId) qb.andWhere('u.clientId = :clientId', { clientId });
    if (search) {
      const s = `%${search}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('u.first_name LIKE :s', { s })
            .orWhere('u.last_name LIKE :s', { s })
            .orWhere('u.email LIKE :s', { s })
            .orWhere('u.phone LIKE :s', { s })
            .orWhere('u.userId LIKE :s', { s });
        }),
      );
    }

    qb.orderBy('u.id', 'DESC').skip(skip).take(take);
    return qb.getManyAndCount();
  }

  findByIdExcludingPassword(id: number) {
    return this.userRepo.findOne({
      where: { id },
      relations: { wallet: true },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        pan: true,
        gst: true,
        userId: true,
        fcmToken: true,
        status: true,
        isFirstLogin: true,
        clientId: true,
        appName: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
    });
  }

  findByIdSimple(id: number) {
    return this.userRepo.findOne({
      where: { id },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        pan: true,
        gst: true,
        userId: true,
        fcmToken: true,
        status: true,
        isFirstLogin: true,
        clientId: true,
        appName: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
    });
  }

  async updateUser(id: number, data: QueryDeepPartialEntity<User>) {
    await this.userRepo.update(id, data);
  }

  async findAndCountPayments(userId: number, skip: number, take: number) {
    return this.paymentTransactionRepo.findAndCount({
      where: { userId },
      select: { id: true, paymentId: true, paymentType: true, orderId: true, amount: true, status: true, utr: true, createdAt: true },
      order: { id: 'DESC' },
      skip,
      take,
    });
  }

  findUserWallet(userId: number) {
    return this.walletRepo.findOne({ where: { userId, type: 'User' } });
  }

  async findAndCountWalletTransactions(walletId: number, skip: number, take: number) {
    return this.walletTransactionRepo.findAndCount({
      where: { walletId },
      select: { id: true, refNo: true, amount: true, type: true, remainingBalance: true, createdAt: true, note: true },
      relations: { paymentTransaction: true, staff: true },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  async findAndCountDeviceTransactions(userId: number, skip: number, take: number) {
    return this.deviceTransactionRepo.findAndCount({
      where: { userId },
      relations: { charger: { station: true } },
      select: { charger: { id: true, chargerId: true, station: { id: true, stationUniqueId: true } } },
      order: { id: 'DESC' },
      skip,
      take,
    });
  }

  async findAndCountRfidTags(userId: number, skip: number, take: number) {
    return this.rfidTagRepo.findAndCount({
      where: { userId },
      relations: { masterTag: true, vendor: true },
      select: { vendor: { id: true, vendorUniqueId: true, vendor_name: true } },
      skip,
      take,
    });
  }

  async findAndCountVendorUsers(userId: number, skip: number, take: number) {
    return this.vendorUserRepo.findAndCount({
      where: { userId },
      relations: { vendor: true, userType: true },
      select: { vendor: { id: true, vendor_name: true, community_name: true, vendorUniqueId: true, phone: true } },
      skip,
      take,
    });
  }

  async findAndCountVehicles(userId: number, skip: number, take: number) {
    return this.vehicleRepo.findAndCount({
      where: { userId },
      relations: { model: { brand: true } },
      select: { model: { id: true, name: true, brand: { id: true, name: true } } },
      order: { id: 'DESC' },
      skip,
      take,
    });
  }

  findVehicleByIdAndUser(vehicleId: number, userId: number) {
    return this.vehicleRepo.findOne({ where: { id: vehicleId, userId } });
  }

  async updateVehicleAutoCharge(id: number, autoCharge: boolean) {
    await this.vehicleRepo.update(id, { autoCharge });
  }
}
