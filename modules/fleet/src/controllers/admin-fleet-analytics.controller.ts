import { Controller, Get, Param, ParseIntPipe, Query, Req, UseGuards } from '@nestjs/common';
import { AdminAuthGuard, ClientFeaturesGuard, ClientFeatureRequired, StaffPermissionsGuard, StaffPermission } from '@modules/auth';
import { AdminFleetAnalyticsService } from '../services/admin-fleet-analytics.service';

/** Mirrors `routes/admin/fleet/analyticRoutes.js` + `controllers/admin/fleet/analyticController.js`. */
@Controller('v1/admin/fleet/analytic')
@UseGuards(AdminAuthGuard, ClientFeaturesGuard, StaffPermissionsGuard)
@ClientFeatureRequired('Fleet Module')
@StaffPermission('Fleet_View')
export class AdminFleetAnalyticsController {
  constructor(private readonly analyticsService: AdminFleetAnalyticsService) {}

  private clientId(req: any): number {
    return Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 0);
  }

  @Get('each-month/:fleetId')
  async getAnalyticsEachMonthByFleetId(
    @Req() req: any,
    @Param('fleetId', ParseIntPipe) fleetId: number,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.analyticsService.getAnalyticsEachMonthByFleetId(fleetId, this.clientId(req), month, year);
  }

  @Get('count/:fleetId')
  async getAllFleetUsersDetailsCount(@Req() req: any, @Param('fleetId', ParseIntPipe) fleetId: number) {
    return this.analyticsService.getAllFleetUsersDetailsCount(fleetId, this.clientId(req));
  }
}
