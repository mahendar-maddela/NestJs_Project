import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../users/src/entities/user.entity';
import { VendorUser } from '../../../vendors/src/entities/vendor-user.entity';
import { Wallet } from '../../../wallet/src/entities/wallet.entity';
import { RoamingTariff } from '../../../ocpi/src/entities/roaming-tariff.entity';

/** Mirrors the user-specific data access needed by `controllers/ocpp/RemoteStartController.js:handleRemoteStart`. */
@Injectable()
export class UserRemoteControlRepository {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(VendorUser) private readonly vendorUserRepo: Repository<VendorUser>,
    @InjectRepository(Wallet) private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(RoamingTariff) private readonly roamingTariffRepo: Repository<RoamingTariff>,
  ) {}

  async findUserWithVendorUserTypes(userId: number, vendorId: number | null) {
    const user = await this.userRepo.findOne({ where: { id: userId }, select: { id: true, userId: true } });
    if (!user) return null;

    const vendorUsers = await this.vendorUserRepo.find({
      where: { userId: user.id, ...(vendorId ? { vendorId } : {}) },
      relations: { userType: true },
    });

    return { ...user, vendorUserTypes: vendorUsers };
  }

  findUserWallet(userId: number) {
    return this.walletRepo.findOne({ where: { userId, type: 'User' }, select: { id: true, balance: true } });
  }

  findRoamingTariff(chargerId: number, chargerClientId: number, importClientId: number) {
    return this.roamingTariffRepo.findOne({ where: { chargerId, clientId: chargerClientId, importClientId } });
  }
}
