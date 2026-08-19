import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '@modules/auth';
import { AdminVendorCreditsService } from '../services/admin-vendor-credits.service';
import { AddVendorCreditsDto } from '../dto/admin-vendor-credits.dto';

/** Mirrors `routes/admin/vendorCreditsRoutes.js` + `controllers/admin/vendorCreaditsController.js`. */
@Controller('v1/admin/vendor-credits')
@UseGuards(AdminAuthGuard)
export class AdminVendorCreditsController {
  constructor(private readonly vendorCreditsService: AdminVendorCreditsService) {}

  private clientId(req: any): number {
    return Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 0);
  }

  @Get()
  async getVendorStaffWalletTransactions(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.vendorCreditsService.getVendorStaffWalletTransactions(Number(page) || 1, Number(limit) || 200);
  }

  @Post()
  async addCreditsToVendor(@Req() req: any, @Body() dto: AddVendorCreditsDto) {
    return this.vendorCreditsService.addCreditsToVendor(this.clientId(req), req.staff?.id ?? req.user?.id, dto);
  }
}
