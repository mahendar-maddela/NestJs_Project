import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { Coupon } from '../entities/coupon.entity';
import { CouponUser } from '../entities/coupon-user.entity';
import { User } from '../entities/user.entity';
import { PrefixConfig } from '../../../clients/src/entities/prefix-config.entity';

@Injectable()
export class AdminCouponRepository {
  constructor(
    @InjectRepository(Coupon) private readonly couponRepo: Repository<Coupon>,
    @InjectRepository(CouponUser) private readonly couponUserRepo: Repository<CouponUser>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(PrefixConfig) private readonly prefixConfigRepo: Repository<PrefixConfig>,
    private readonly dataSource: DataSource,
  ) {}

  async findPrefixConfig(clientId: number) {
    return this.prefixConfigRepo.findOne({ where: { clientId } });
  }

  async findAndCountPaginated(clientId: number, skip: number, take: number) {
    const [rows, count] = await this.couponRepo.findAndCount({
      where: { clientId },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });

    const couponIds = rows.map((c) => c.id);
    const userCountsByCoupon = await this.userIdsByCoupon(couponIds);

    const withUsers = rows.map((c) => ({ ...c, users: (userCountsByCoupon.get(c.id) || []).map((id) => ({ id })) }));
    return [withUsers, count] as const;
  }

  async findByIdAndClient(id: number, clientId: number) {
    return this.couponRepo.findOne({ where: { id, clientId } });
  }

  async findByIdAndClientWithUsers(id: number, clientId: number) {
    const coupon = await this.couponRepo.findOne({ where: { id, clientId } });
    if (!coupon) return null;

    const users = await this.dataSource
      .createQueryBuilder()
      .select(['u.id AS id', 'u.userId AS userId', 'u.first_name AS first_name'])
      .from(User, 'u')
      .innerJoin(CouponUser, 'cu', 'cu.userId = u.id')
      .where('cu.couponId = :couponId', { couponId: id })
      .getRawMany();

    return { ...coupon, users };
  }

  private async userIdsByCoupon(couponIds: number[]): Promise<Map<number, number[]>> {
    const map = new Map<number, number[]>();
    if (!couponIds.length) return map;
    const rows = await this.couponUserRepo.find({ where: { couponId: In(couponIds) } });
    for (const r of rows) {
      if (!map.has(r.couponId)) map.set(r.couponId, []);
      map.get(r.couponId)!.push(r.userId);
    }
    return map;
  }

  async createCoupon(data: Partial<Coupon>) {
    return this.couponRepo.save(this.couponRepo.create(data));
  }

  async update(id: number, data: QueryDeepPartialEntity<Coupon>) {
    await this.couponRepo.update(id, data);
    return this.couponRepo.findOne({ where: { id } });
  }

  async findExistingCouponUserIds(couponId: number) {
    const rows = await this.couponUserRepo.find({ where: { couponId } });
    return rows.map((r) => r.userId);
  }

  async findUsersByIds(ids: number[], clientId: number) {
    if (!ids.length) return [];
    return this.userRepo.find({ where: { id: In(ids), clientId }, select: { id: true, userId: true, fcmToken: true } });
  }

  async addCouponUsers(couponId: number, userIds: number[]) {
    if (!userIds.length) return;
    await this.couponUserRepo.save(userIds.map((userId) => this.couponUserRepo.create({ couponId, userId })));
  }

  async removeCouponUsers(couponId: number, userIds: number[]) {
    if (!userIds.length) return;
    await this.couponUserRepo.delete({ couponId, userId: In(userIds) });
  }

  /** Mirrors `controllers/APP/couponController.js:getAllActiveCoupons`. */
  findActiveCouponsForUser(userId: number, clientId: number, today: string) {
    return this.couponRepo
      .createQueryBuilder('c')
      .select(['c.id', 'c.startDate', 'c.endDate', 'c.amount', 'c.code', 'c.cashbackPercent', 'c.note', 'c.status', 'c.maxCashbackAmount'])
      .innerJoin(CouponUser, 'cu', 'cu.couponId = c.id AND cu.userId = :userId', { userId })
      .where('DATE(c.startDate) <= :today', { today })
      .andWhere('DATE(c.endDate) >= :today', { today })
      .andWhere('c.status = :status', { status: 'Active' })
      .andWhere('c.clientId = :clientId', { clientId })
      .orderBy('c.createdAt', 'DESC')
      .getMany();
  }

  /** Mirrors legacy's `sequelize.transaction()` wrapping create/update + coupon-user assignment. */
  async runInTransaction<T>(work: (repos: {
    coupon: Repository<Coupon>;
    couponUser: Repository<CouponUser>;
    user: Repository<User>;
  }) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(async (manager) => {
      return work({
        coupon: manager.getRepository(Coupon),
        couponUser: manager.getRepository(CouponUser),
        user: manager.getRepository(User),
      });
    });
  }
}
