import { Controller, Get, Param, ParseIntPipe, Query, Req, UseGuards } from '@nestjs/common';
import { VendorAuthGuard } from '@modules/auth';
import { VendorCpoSettlementService } from '../services/vendor-cpo-settlement.service';

/** Mirrors `routes/vendor/settlementRoutes.js` + `controllers/vendors/settlementTransactionController.js`. */
@Controller('v1/vendor/settlement')
@UseGuards(VendorAuthGuard)
export class VendorCpoSettlementController {
  constructor(private readonly settlementService: VendorCpoSettlementService) {}

  private vendorId(req: any): number {
    return Number(req.vendor?.vendorId || req.user?.id || 0);
  }

  @Get('due')
  async getDueSettlements(@Req() req: any, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.settlementService.getDueSettlements(this.vendorId(req), Number(page) || 1, Number(limit) || 10);
  }

  @Get('chargers')
  async getChargerList(@Req() req: any) {
    return this.settlementService.getChargerList(this.vendorId(req));
  }

  @Get('charger/:chargerId')
  async getChargerDetails(@Req() req: any, @Param('chargerId', ParseIntPipe) chargerId: number, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.settlementService.getChargerDetails(chargerId, this.vendorId(req), Number(page) || 1, Number(limit) || 10);
  }

  @Get('settlements/vendors')
  async getVendorSettlements(@Req() req: any) {
    return this.settlementService.getVendorSettlements(this.vendorId(req));
  }
}
