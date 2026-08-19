import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { VendorAuthGuard, VendorFeaturesGuard, VendorFeatureRequired } from '@modules/auth';
import { VendorCpoAmcService } from '../services/vendor-cpo-amc.service';

/** Mirrors `routes/vendor/amcRoutes.js` + `controllers/vendors/amcController.js`. */
@Controller('v1/vendor/amc')
@UseGuards(VendorAuthGuard, VendorFeaturesGuard)
@VendorFeatureRequired('AMC')
export class VendorCpoAmcController {
  constructor(private readonly amcService: VendorCpoAmcService) {}

  private vendorId(req: any): number {
    return Number(req.vendor?.vendorId || req.user?.id || 0);
  }

  @Get('upcoming')
  async getUpcomingOrExpiredAmcs(@Req() req: any) {
    return this.amcService.getUpcomingOrExpiredAmcs(this.vendorId(req));
  }

  @Get()
  async getActiveAmcs(@Req() req: any) {
    return this.amcService.getActiveAmcs(this.vendorId(req));
  }
}
