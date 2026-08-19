import { Controller, Get, Param, ParseIntPipe, Req, UseGuards } from '@nestjs/common';
import { AdminAuthGuard, ClientFeaturesGuard, ClientFeatureRequired, StaffPermissionsGuard, StaffPermission } from '@modules/auth';
import { AdminFleetTariffService } from '../services/admin-fleet-tariff.service';

/** Mirrors `routes/admin/fleet/tariffRoutes.js` + `controllers/admin/fleet/tariffController.js`. */
@Controller('v1/admin/fleet/tariff')
@UseGuards(AdminAuthGuard, ClientFeaturesGuard, StaffPermissionsGuard)
@ClientFeatureRequired('Fleet Module')
@StaffPermission('Fleet_View')
export class AdminFleetTariffController {
  constructor(private readonly fleetTariffService: AdminFleetTariffService) {}

  private clientId(req: any): number {
    return Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 0);
  }

  @Get('charger/:userTypeId')
  async getTariffByUserTypeId(@Req() req: any, @Param('userTypeId', ParseIntPipe) userTypeId: number) {
    return this.fleetTariffService.getTariffByUserTypeId(userTypeId, this.clientId(req));
  }

  @Get(':fleetGroupId')
  async getAllTariffsByGroupId(@Req() req: any, @Param('fleetGroupId', ParseIntPipe) fleetGroupId: number) {
    return this.fleetTariffService.getAllTariffsByGroupId(fleetGroupId, this.clientId(req));
  }
}
