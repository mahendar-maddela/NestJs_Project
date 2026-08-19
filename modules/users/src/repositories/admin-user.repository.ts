import { Injectable } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, DeepPartial, FindOptionsWhere, Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { UserStatus } from 'database/src';
import { User } from '../entities/user.entity';
import { Vehicle } from '../entities/vehicle.entity';
import { DeviceTransaction } from '../../../sessions/src/entities/device-transaction.entity';
import { Wallet } from '../../../wallet/src/entities/wallet.entity';
import { WalletTransaction } from '../../../wallet/src/entities/wallet-transaction.entity';
import { RfidTag } from '../../../fleet/src/entities/rfid-tag.entity';
import { VendorUser } from '../../../vendors/src/entities/vendor-user.entity';
import { PaymentTransaction } from '../../../payments/src/entities/payment-transaction.entity';
import { PrefixConfig } from '../../../clients/src/entities/prefix-config.entity';

@Injectable()
export class AdminUserRepository {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(DeviceTransaction) private readonly deviceTransactionRepo: Repository<DeviceTransaction>,
    @InjectRepository(Wallet) private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(WalletTransaction) private readonly walletTransactionRepo: Repository<WalletTransaction>,
    @InjectRepository(RfidTag) private readonly rfidTagRepo: Repository<RfidTag>,
    @InjectRepository(VendorUser) private readonly vendorUserRepo: Repository<VendorUser>,
    @InjectRepository(PaymentTransaction) private readonly paymentTransactionRepo: Repository<PaymentTransaction>,
    @InjectRepository(Vehicle) private readonly vehicleRepo: Repository<Vehicle>,
    @InjectRepository(PrefixConfig) private readonly prefixConfigRepo: Repository<PrefixConfig>,
  ) {}

  async createUserTransaction<T>(fn: (manager: DataSource['manager']) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(fn);
  }

  async findSimpleUsers(clientId: number) {
    const users = await this.userRepo.find({
      where: { clientId },
      select: { id: true, first_name: true, userId: true, createdAt: true, status: true },
      order: { id: 'DESC' },
    });
    return { count: users.length, users };
  }

  async findPaginatedUsers(where: FindOptionsWhere<User> | FindOptionsWhere<User>[], skip: number, limit: number) {
    const [rows, count] = await this.userRepo.findAndCount({
      where,
      skip,
      take: limit,
      select: { id: true, first_name: true, userId: true, createdAt: true, status: true, phone: true, email: true },
      relations: { wallet: true },
      order: { id: 'DESC' },
    });

    return { count, rows };
  }

  async findUserByIdAndClient(id: number, clientId: number) {
    return this.userRepo.findOne({
      where: { id, clientId },
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
      },
      relations: { wallet: true },
    });
  }

  async updateUser(id: number, data: DeepPartial<User>) {
    await this.userRepo.update({ id }, data as QueryDeepPartialEntity<User>);
    return this.userRepo.findOne({ where: { id } });
  }

  async updateUserStatus(id: number, status: UserStatus) {
    await this.userRepo.update({ id }, { status });
    return this.userRepo.findOne({ where: { id } });
  }

  async deleteUser(id: number) {
    return this.userRepo.delete({ id });
  }

  async findDeviceTransactions(
    where: FindOptionsWhere<DeviceTransaction>,
    skip: number,
    limit: number,
    includeDetails = false,
  ) {
    if (!includeDetails) {
      const [rows, count] = await this.deviceTransactionRepo.findAndCount({
        where,
        skip,
        take: limit,
        order: { id: 'DESC' },
      });
      return { count, rows };
    }

    const [rows, count] = await this.deviceTransactionRepo.findAndCount({
      where,
      skip,
      take: limit,
      relations: { charger: { station: true }, client: { clientDetails: true } },
      order: { id: 'DESC' },
    });

    return { count, rows };
  }

  async findUserWallet(userId: number, clientId: number) {
    return this.walletRepo.findOne({ where: { userId, type: 'User', clientId } });
  }

  async findWalletTransactions(walletId: number, clientId: number, skip: number, limit: number) {
    const [rows, count] = await this.walletTransactionRepo.findAndCount({
      where: { walletId, clientId },
      skip,
      take: limit,
      select: {
        id: true,
        refNo: true,
        amount: true,
        type: true,
        remainingBalance: true,
        createdAt: true,
        note: true,
        paymentTransaction: { id: true, paymentId: true },
        staff: { id: true, first_name: true },
      },
      relations: { paymentTransaction: true, staff: true },
      order: { createdAt: 'DESC' },
    });
    return { count, rows };
  }

  async findUserRfidTags(userId: number, clientId: number, skip: number, limit: number) {
    const [rows, count] = await this.rfidTagRepo.findAndCount({
      where: { userId, clientId },
      skip,
      take: limit,
      relations: { masterTag: true, vendor: true },
    });
    return { count, rows };
  }

  async findUserVendors(userId: number, clientId: number) {
    return this.vendorUserRepo.find({
      where: { userId, clientId },
      relations: { vendor: true, userType: true },
    });
  }

  async findUserPayments(userId: number, clientId: number, skip: number, limit: number) {
    const [rows, count] = await this.paymentTransactionRepo.findAndCount({
      where: { userId, clientId },
      skip,
      take: limit,
      select: { id: true, paymentId: true, paymentType: true, orderId: true, amount: true, status: true, utr: true, createdAt: true },
      order: { id: 'DESC' },
    });
    return { count, rows };
  }

  async findUserVehicles(userId: number, clientId: number) {
    return this.vehicleRepo.find({
      where: { userId, clientId },
      relations: { model: { brand: true } },
      order: { id: 'DESC' },
    });
  }

  async findVehicleByIdUserAndClient(vehicleId: number, userId: number, clientId: number) {
    return this.vehicleRepo.findOne({ where: { id: vehicleId, userId, clientId } });
  }

  async updateVehicleAutoCharge(vehicleId: number, autoCharge: boolean) {
    await this.vehicleRepo.update({ id: vehicleId }, { autoCharge });
    return this.vehicleRepo.findOne({ where: { id: vehicleId } });
  }

  async findUserByStringIdAndClient(stringUserId: string, clientId: number) {
    return this.userRepo.findOne({ where: { userId: stringUserId, clientId } });
  }

  async findPrefixConfig(clientId: number) {
    return this.prefixConfigRepo.findOne({ where: { clientId }, select: { wallet: true, id: true, clientId: true } });
  }

  async findWalletTransactionByRefNo(refNo: string) {
    return this.walletTransactionRepo.findOne({ where: { refNo } });
  }
}
