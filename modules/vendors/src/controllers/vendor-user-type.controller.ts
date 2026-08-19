import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { VendorAuthGuard } from '@modules/auth';
import { VendorService } from '../services/vendor.service';

/** Mirrors `routes/vendor/userTypeRoutes.js` + `controllers/vendors/userTypeController.js`. */
@Controller('v1/vendor/user-type')
@UseGuards(VendorAuthGuard)
export class VendorUserTypeController {
  constructor(private readonly vendorService: VendorService) {}

  private vendorId(req: any): number {
    return Number(req.vendor?.vendorId || req.user?.id || 0);
  }

  @Get()
  async getAllUserTypes(@Req() req: any) {
    return this.vendorService.getUserTypes(this.vendorId(req));
  }
}
