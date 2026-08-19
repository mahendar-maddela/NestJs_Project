import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { User } from '../../../users/src/entities/user.entity';
import { VendorUser } from '../entities/vendor-user.entity';
import { Credit } from '../../../wallet/src/entities/credit.entity';
import { Charger } from '../../../chargers/src/entities/charger.entity';
import { DeviceTransaction } from '../../../sessions/src/entities/device-transaction.entity';
import { WalletTransaction } from '../../../wallet/src/entities/wallet-transaction.entity';
import { RfidTag } from '../../../fleet/src/entities/rfid-tag.entity';

@Injectable()
export class VendorUserRepository {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(VendorUser) private readonly vendorUserRepo: Repository<VendorUser>,
    @InjectRepository(Credit) private readonly creditRepo: Repository<Credit>,
    @InjectRepository(Charger) private readonly chargerRepo: Repository<Charger>,
    @InjectRepository(DeviceTransaction) private readonly deviceTransactionRepo: Repository<DeviceTransaction>,
    @InjectRepository(WalletTransaction) private readonly walletTransactionRepo: Repository<WalletTransaction>,
    @InjectRepository(RfidTag) private readonly rfidTagRepo: Repository<RfidTag>,
  ) {}

  async findAndCountVendorUsers(vendorId: number, search: string | undefined, skip: number, take: number) {
    const qb = this.userRepo
      .createQueryBuilder('u')
      .select(['u.id', 'u.first_name', 'u.email', 'u.phone', 'u.userId', 'u.createdAt'])
      .innerJoin(VendorUser, 'vu', 'vu.userId = u.id AND vu.vendorId = :vendorId', { vendorId })
      .addSelect(['vu.userTypeId', 'vu.status'])
      .innerJoin(Credit, 'credit', 'credit.userId = u.id AND credit.vendorId = :vendorId2', { vendorId2: vendorId })
      .addSelect(['credit.id', 'credit.balance', 'credit.status']);

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

    qb.orderBy('u.createdAt', 'DESC').skip(skip).take(take);

    const [entities, count] = await Promise.all([qb.getRawAndEntities(), qb.getCount()]);
    return { rows: entities.entities, raw: entities.raw, count };
  }

  async findUserTypeNamesByIds(userTypeIds: number[]): Promise<Map<number, string>> {
    const map = new Map<number, string>();
    if (!userTypeIds.length) return map;
    const rows = await this.vendorUserRepo.manager
      .createQueryBuilder()
      .select(['ut.id AS id', 'ut.name AS name'])
      .from('User_Types', 'ut')
      .where('ut.id IN (:...ids)', { ids: userTypeIds })
      .getRawMany<{ id: number; name: string }>();
    for (const row of rows) map.set(row.id, row.name);
    return map;
  }

  findChargerIdsByVendor(vendorId: number) {
    return this.chargerRepo.find({ where: { vendorId }, select: { id: true } });
  }

  findUserByBusinessId(userId: string) {
    return this.userRepo.findOne({ where: { userId }, select: { id: true } });
  }

  async findAndCountUserDeviceTransactions(userId: number, chargerIds: number[], skip: number, take: number) {
    if (!chargerIds.length) return { rows: [], count: 0 };
    return this.deviceTransactionRepo
      .findAndCount({
        where: { userId, chargerRef: In(chargerIds) },
        relations: { charger: { station: true }, user: true },
        order: { id: 'DESC' },
        skip,
        take,
      })
      .then(([rows, count]) => ({ rows, count }));
  }

  findCreditByUserAndVendor(userId: number, vendorId: number) {
    return this.creditRepo.findOne({ where: { userId, vendorId }, select: { id: true, userId: true, balance: true } });
  }

  async findAndCountCreditWalletTransactions(chargerIds: number[], vendorId: number, creditId: number, skip: number, take: number) {
    const qb = this.walletTransactionRepo
      .createQueryBuilder('wt')
      .leftJoinAndSelect('wt.wallet', 'wallet')
      .where('wt.userType = :userType', { userType: 'User' })
      .andWhere(
        new Brackets((sub) => {
          if (chargerIds.length) sub.orWhere('wt.chargerId IN (:...chargerIds)', { chargerIds });
          sub.orWhere('wt.creditsId = :creditId', { creditId });
        }),
      )
      .orderBy('wt.id', 'DESC')
      .skip(skip)
      .take(take);

    const [rows, count] = await qb.getManyAndCount();
    return { rows, count };
  }

  findVendorUserByBusinessUserIdAndVendor(userId: string, vendorId: number) {
    return this.vendorUserRepo
      .createQueryBuilder('vu')
      .innerJoin(User, 'u', 'u.id = vu.userId')
      .where('u.userId = :userId', { userId })
      .andWhere('vu.vendorId = :vendorId', { vendorId })
      .select(['vu.userId AS userId', 'vu.userTypeId AS userTypeId', 'vu.status AS status'])
      .getRawOne();
  }

  findVendorUserByUserIdAndVendor(userId: number, vendorId: number) {
    return this.vendorUserRepo.findOne({ where: { userId, vendorId } });
  }

  async updateVendorUserStatus(id: number, status: string) {
    await this.vendorUserRepo.update(id, { status } as any);
  }

  findUsersForDropdown(clientId: number, userIdLike: string | undefined) {
    const qb = this.userRepo
      .createQueryBuilder('u')
      .select(['u.id', 'u.first_name', 'u.userId', 'u.phone', 'u.clientId'])
      .where('u.clientId = :clientId', { clientId });
    if (userIdLike) qb.andWhere('u.userId LIKE :s', { s: `%${userIdLike}%` });
    return qb.getMany();
  }

  findRfidTagsByUserAndVendor(userId: number, vendorId: number) {
    return this.rfidTagRepo.find({ where: { userId, vendorId }, select: { id: true, rfIdTag: true } });
  }
}
