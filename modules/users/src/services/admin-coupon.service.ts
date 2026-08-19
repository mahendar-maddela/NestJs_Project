import { Injectable, NotFoundException } from '@nestjs/common';
import { In } from 'typeorm';
import { AdminCouponRepository } from '../repositories/admin-coupon.repository';
import { CreateCouponDto, UpdateCouponDto, CouponQueryDto } from '../dto/admin-coupon.dto';
import { FirebaseService } from '@integrations/firebase';

/** Mirrors `controllers/admin/couponController.js`. */
@Injectable()
export class AdminCouponService {
  constructor(
    private readonly repo: AdminCouponRepository,
    private readonly firebaseService: FirebaseService,
  ) {}

  async getCoupons(clientId: number, query: CouponQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const [rows, count] = await this.repo.findAndCountPaginated(clientId, skip, limit);

    return {
      success: true,
      message: 'Coupons fetched successfully',
      data: rows,
      pagination: { total: count, totalPages: Math.ceil(count / limit), page },
    };
  }

  async getCouponById(id: number, clientId: number) {
    const coupon = await this.repo.findByIdAndClientWithUsers(id, clientId);
    if (!coupon) {
      throw new NotFoundException({ success: false, message: 'Coupon not found' });
    }
    return { success: true, message: 'Coupon fetched successfully', data: coupon };
  }

  async createCoupon(clientId: number, staffId: number | undefined, dto: CreateCouponDto) {
    const prefixConfig = await this.repo.findPrefixConfig(clientId);
    const code = `${(prefixConfig?.coupon || '').toUpperCase()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const coupon = await this.repo.runInTransaction(async ({ coupon: couponRepo, couponUser: couponUserRepo, user: userRepo }) => {
      const created = await couponRepo.save(
        couponRepo.create({
          code,
          startDate: dto.startDate ? new Date(dto.startDate) : null,
          endDate: dto.endDate ? new Date(dto.endDate) : null,
          amount: dto.amount,
          cashbackPercent: dto.cashbackPercent,
          maxCashbackAmount: dto.maxCashbackAmount,
          note: dto.note,
          staffId,
          clientId,
        }),
      );

      const userIds = dto.userIds || [];
      if (userIds.length) {
        const users = await userRepo.find({ where: { id: In(userIds), clientId }, select: { id: true, userId: true, fcmToken: true } });
        await couponUserRepo.save(users.map((u) => couponUserRepo.create({ userId: u.id, couponId: created.id })));

        const tokens = users.map((u) => u.fcmToken).filter((t): t is string => Boolean(t));
        await this.notifyBonusCredited(clientId, tokens, dto.maxCashbackAmount, dto.amount);
      }

      return created;
    });

    return { success: true, message: 'Coupon created and assigned successfully', data: coupon };
  }

  async updateCoupon(id: number, clientId: number, dto: UpdateCouponDto) {
    const existing = await this.repo.findByIdAndClient(id, clientId);
    if (!existing) {
      throw new NotFoundException({ success: false, message: 'Coupon not found' });
    }

    const coupon = await this.repo.runInTransaction(async ({ coupon: couponRepo, couponUser: couponUserRepo, user: userRepo }) => {
      await couponRepo.update(id, {
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        amount: dto.amount,
        cashbackPercent: dto.cashbackPercent,
        maxCashbackAmount: dto.maxCashbackAmount,
        note: dto.note,
      });

      const userIds = dto.userIds;
      if (Array.isArray(userIds) && userIds.length) {
        const existingMappings = await couponUserRepo.find({ where: { couponId: id } });
        const existingUserIds = existingMappings.map((m) => m.userId);

        const usersToAdd = userIds.filter((uid) => !existingUserIds.includes(uid));
        const usersToRemove = existingUserIds.filter((uid) => !userIds.includes(uid));

        if (usersToAdd.length) {
          const users = await userRepo.find({ where: { id: In(usersToAdd), clientId }, select: { id: true, fcmToken: true } });
          await couponUserRepo.save(users.map((u) => couponUserRepo.create({ userId: u.id, couponId: id })));

          const tokens = users.map((u) => u.fcmToken).filter((t): t is string => Boolean(t));
          await this.notifyBonusCredited(clientId, tokens, dto.maxCashbackAmount, dto.amount);
        }

        if (usersToRemove.length) {
          await couponUserRepo.delete({ couponId: id, userId: In(usersToRemove) });
        }
      }

      return couponRepo.findOne({ where: { id } });
    });

    return { success: true, message: 'Coupon updated successfully', data: coupon };
  }

  private async notifyBonusCredited(clientId: number, tokens: string[], maxCashbackAmount?: number, amount?: number) {
    if (!tokens.length) return;
    await this.firebaseService.sendToClientTokens(clientId, tokens, {
      title: '🎉 Bonus Credited!',
      body: {
        message: `₹${maxCashbackAmount} bonus added to your wallet on your ₹${amount} recharge, because staying with us always gives you a little extra 😉⚡`,
      },
      type: 'Offers',
    });
  }
}
