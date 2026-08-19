import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, MoreThan, Not, IsNull, Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { User } from '../entities/user.entity';
import { Vehicle } from '../entities/vehicle.entity';
import { DeviceTransaction } from '../../../sessions/src/entities/device-transaction.entity';
import { StationFavourite } from '../../../stations/src/entities/station-favourite.entity';
import { CredentialConfig } from '../../../clients/src/entities/credential-config.entity';
import { ClientDetails } from '../../../clients/src/entities/client-details.entity';
import { Otp } from '../../../auth/src/entities/otp.entity';

@Injectable()
export class UserProfileRepository {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Vehicle) private readonly vehicleRepo: Repository<Vehicle>,
    @InjectRepository(DeviceTransaction) private readonly deviceTransactionRepo: Repository<DeviceTransaction>,
    @InjectRepository(StationFavourite) private readonly stationFavouriteRepo: Repository<StationFavourite>,
    @InjectRepository(CredentialConfig) private readonly credentialConfigRepo: Repository<CredentialConfig>,
    @InjectRepository(ClientDetails) private readonly clientDetailsRepo: Repository<ClientDetails>,
    @InjectRepository(Otp) private readonly otpRepo: Repository<Otp>,
  ) {}

  async findProfile(userId: number, clientId: number) {
    return this.userRepo.findOne({
      where: { id: userId, clientId },
      select: { id: true, first_name: true, last_name: true, email: true, userId: true, phone: true, gst: true },
    });
  }

  async countVehicles(userId: number, clientId: number) {
    return this.vehicleRepo.count({ where: { userId, clientId } });
  }

  async countChargingSessions(userId: number, clientId: number) {
    return this.deviceTransactionRepo.count({ where: { userId, clientId } });
  }

  async countFavourites(userId: number) {
    return this.stationFavouriteRepo.count({ where: { userId } });
  }

  async findUserForUpdate(userId: number, clientId: number) {
    return this.userRepo.findOne({ where: { id: userId, clientId } });
  }

  async findUserByField(field: 'email' | 'phone', value: string, clientId: number) {
    return this.userRepo.findOne({ where: { [field]: value, clientId }, select: { id: true, email: true, phone: true } });
  }

  async updateUser(id: number, data: DeepPartial<User>) {
    await this.userRepo.update({ id }, data as QueryDeepPartialEntity<User>);
    return this.userRepo.findOne({ where: { id } });
  }

  async findCredentialConfig(clientId: number) {
    return this.credentialConfigRepo.findOne({ where: { clientId } });
  }

  async findClientDetails(clientId: number) {
    return this.clientDetailsRepo.findOne({ where: { clientId } });
  }

  async findRecentOtp(userId: number, sinceMs: number) {
    return this.otpRepo.findOne({
      where: { type_id: userId, type: 'user', createdAt: MoreThan(new Date(Date.now() - sinceMs)) },
    });
  }

  async deleteOtps(userId: number) {
    return this.otpRepo.delete({ type_id: userId, type: 'user' });
  }

  async createOtp(data: DeepPartial<Otp>) {
    return this.otpRepo.save(this.otpRepo.create(data));
  }

  async findOtpWithContact(userId: number, otp: string) {
    return this.otpRepo.findOne({ where: { type_id: userId, type: 'user', otp, contact: Not(IsNull()) } });
  }

  async deleteOtp(id: number) {
    return this.otpRepo.delete({ id });
  }
}
