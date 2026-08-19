import { Controller, Get, Param, ParseIntPipe, Req, UseGuards } from '@nestjs/common';
import { VendorAuthGuard } from '@modules/auth';
import { VendorFleetTariffService } from '../services/vendor-fleet-tariff.service';

/** Mirrors `routes/vendor/fleet/tariffRoutes.js` + `controllers/vendors/Fleet/taiffController.js`. */
@Controller('v1/vendor/fleet/tariff')
@UseGuards(VendorAuthGuard)
export class VendorFleetTariffController {
  constructor(private readonly tariffService: VendorFleetTariffService) {}

  private vendorId(req: any): number {
    return Number(req.vendor?.vendorId || req.user?.id || 0);
  }

  @Get(':groupId')
  async getTariffByGroupId(@Req() req: any, @Param('groupId', ParseIntPipe) groupId: number) {
    return this.tariffService.getTariffByGroupId(groupId, this.vendorId(req));
  }
}
