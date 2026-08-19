import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { UserAuthGuard } from '@modules/auth';
import { AppCouponService } from '../services/app-coupon.service';

function currentClientId(req: any): number {
  return Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 1);
}

/** Mirrors `routes/app/couponsRoutes.js`, mounted at `v1/coupon` and reused at `v1/web/coupon` by the web router. */
@Controller(['v1/coupon', 'v1/web/coupon'])
@UseGuards(UserAuthGuard)
export class AppCouponController {
  constructor(private readonly couponService: AppCouponService) {}

  @Get()
  async getAllActiveCoupons(@Req() req: any) {
    return this.couponService.getAllActiveCoupons(req.user.id, currentClientId(req));
  }
}
