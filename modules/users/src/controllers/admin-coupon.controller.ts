import { Controller, Get, Post, Put, Param, Body, Query, Req, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AdminCouponService } from '../services/admin-coupon.service';
import { AdminAuthGuard, StaffPermissionsGuard, StaffPermission, ClientFeaturesGuard, ClientFeatureRequired } from '@modules/auth';
import { CreateCouponDto, UpdateCouponDto, CouponQueryDto } from '../dto/admin-coupon.dto';

@Controller('v1/admin/coupon')
@UseGuards(AdminAuthGuard, ClientFeaturesGuard, StaffPermissionsGuard)
@ClientFeatureRequired('Coupons')
export class AdminCouponController {
  constructor(private readonly adminCouponService: AdminCouponService) {}

  private clientId(req: any): number {
    return Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 0);
  }

  @Post()
  @StaffPermission('Coupon_Create')
  async createCoupon(@Req() req: any, @Body() dto: CreateCouponDto) {
    return this.adminCouponService.createCoupon(this.clientId(req), req.user?.id, dto);
  }

  @Get()
  @StaffPermission('Coupon_View')
  async getCoupons(@Req() req: any, @Query() query: CouponQueryDto) {
    return this.adminCouponService.getCoupons(this.clientId(req), query);
  }

  @Get(':id')
  @StaffPermission('Coupon_View')
  async getCouponById(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.adminCouponService.getCouponById(id, this.clientId(req));
  }

  @Put(':id')
  @StaffPermission('Coupon_Edit')
  async updateCoupon(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCouponDto) {
    return this.adminCouponService.updateCoupon(id, this.clientId(req), dto);
  }
}
