import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AdminAuthGuard, ClientFeaturesGuard, ClientFeatureRequired, StaffPermissionsGuard, StaffPermission } from '@modules/auth';
import { AdminAnalyticsChargerService } from '../services/admin-analytics-charger.service';
import { AnalyticsChargerFilterDto } from '../dto/admin-analytics-charger.dto';

/** Mirrors `routes/admin/AnalyticsChargerRoutes.js` + `controllers/admin/AnalyticsChargerBoxController.js`. */
@Controller('v1/admin/analytics/charger')
@UseGuards(AdminAuthGuard, ClientFeaturesGuard, StaffPermissionsGuard)
@ClientFeatureRequired('Analytics Dashboard')
@StaffPermission('Charger_Analytics_View')
export class AdminAnalyticsChargerController {
  constructor(private readonly analyticsChargerService: AdminAnalyticsChargerService) {}

  private clientId(req: any): number {
    return Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 0);
  }

  @Get('consumption')
  async powerConsumption(@Req() req: any, @Query() query: AnalyticsChargerFilterDto) {
    return this.analyticsChargerService.powerConsumption(this.clientId(req), query);
  }

  @Get('energy-consumption-past-week')
  async getEnergyConsumptionOfPastWeek(@Req() req: any, @Query() query: AnalyticsChargerFilterDto) {
    return this.analyticsChargerService.getEnergyConsumptionOfPastWeek(this.clientId(req), query);
  }

  @Get('charging-sessions-past-week')
  async getChargingSessionsOfPastWeek(@Req() req: any, @Query() query: AnalyticsChargerFilterDto) {
    return this.analyticsChargerService.getChargingSessionsOfPastWeek(this.clientId(req), query);
  }

  @Get('analytics')
  async getChargerAnalytics(@Req() req: any, @Query() query: AnalyticsChargerFilterDto) {
    return this.analyticsChargerService.getChargerAnalytics(this.clientId(req), query);
  }
}
