import { Injectable } from '@nestjs/common';
import { AdminCouponRepository } from '../repositories/admin-coupon.repository';
import { PaymentRepository } from '../../../payments/src/repositories/payment.repository';

/** Mirrors `controllers/APP/couponController.js:getAllActiveCoupons`. Shared by the web and app (driver) actors. */
@Injectable()
export class AppCouponService {
  constructor(
    private readonly repo: AdminCouponRepository,
    private readonly paymentRepo: PaymentRepository,
  ) {}

  async getAllActiveCoupons(userId: number, clientId: number) {
    const today = new Date().toISOString().split('T')[0];
    const activeCoupons = await this.repo.findActiveCouponsForUser(userId, clientId, today);

    const couponsWithUsage = await Promise.all(
      activeCoupons.map(async (coupon) => ({
        ...coupon,
        used: await this.paymentRepo.findSuccessfulByUserCoupon(userId, coupon.id, clientId),
      })),
    );

    return { success: true, message: 'Active coupons fetched successfully', data: couponsWithUsage };
  }
}
