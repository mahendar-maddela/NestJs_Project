import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { VendorAuthGuard } from '@modules/auth';
import { VendorDashboardService } from '../services/vendor-dashboard.service';

/** Mirrors `routes/vendor/dashboardRoutes.js` + `controllers/vendors/dashboard.js`. */
@Controller('v1/vendor/dashboard')
@UseGuards(VendorAuthGuard)
export class VendorDashboardController {
  constructor(private readonly dashboardService: VendorDashboardService) {}

  private vendorId(req: any): number {
    return Number(req.vendor?.vendorId || req.user?.id || 0);
  }

  @Get()
  async getListOfCount(@Req() req: any) {
    return this.dashboardService.getListOfCount(this.vendorId(req));
  }

  @Get('recent-chargingsession')
  async recentChargingSessions(@Req() req: any) {
    return this.dashboardService.recentChargingSessions(this.vendorId(req));
  }

  @Get('faulted')
  async faultedChargeList(@Req() req: any) {
    return this.dashboardService.faultedChargeList(this.vendorId(req));
  }
}
