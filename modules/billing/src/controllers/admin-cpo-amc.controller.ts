import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AdminAuthGuard, ClientFeaturesGuard, ClientFeatureRequired, StaffPermissionsGuard, StaffPermission } from '@modules/auth';
import { AdminCpoAmcService } from '../services/admin-cpo-amc.service';
import { RenewCpoAmcDto } from '../dto/admin-cpo-amc.dto';

/** Mirrors `routes/admin/cpoAmcRoutes.js` + `controllers/admin/cpoAmcController.js`. */
@Controller('v1/admin/cpo-amc')
@UseGuards(AdminAuthGuard, ClientFeaturesGuard, StaffPermissionsGuard)
@ClientFeatureRequired('CPO AMC Management')
@StaffPermission('AMC_Management')
export class AdminCpoAmcController {
  constructor(private readonly cpoAmcService: AdminCpoAmcService) {}

  private clientId(req: any): number {
    return Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 0);
  }

  @Get()
  async getCposWithUpcomingOrExpiredAmcs(@Req() req: any) {
    return this.cpoAmcService.getCposWithUpcomingOrExpiredAmcs(this.clientId(req));
  }

  @Get('charger/:chargerId')
  async getAllAmcByChargerId(
    @Req() req: any,
    @Param('chargerId', ParseIntPipe) chargerId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.cpoAmcService.getAllAmcByChargerId(chargerId, this.clientId(req), Number(page) || 1, Number(limit) || 200);
  }

  @Get('active/:vendorId')
  async getActiveByVendor(@Req() req: any, @Param('vendorId', ParseIntPipe) vendorId: number) {
    return this.cpoAmcService.getCpoAmcExpiredListById(vendorId, this.clientId(req));
  }

  @Get(':vendorId')
  async getCpoAmcExpiredListById(@Req() req: any, @Param('vendorId', ParseIntPipe) vendorId: number) {
    return this.cpoAmcService.getCpoAmcExpiredListById(vendorId, this.clientId(req));
  }

  @Post(':id')
  async renewCpoAmc(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: RenewCpoAmcDto) {
    return this.cpoAmcService.renewCpoAmc(id, this.clientId(req), dto);
  }
}
