import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SuperAdminAuthGuard } from '@modules/auth';
import { SuperAdminAnalyticsChargerService } from '../services/super-admin-analytics-charger.service';
import { SuperAdminAnalyticsChargerFilterDto } from '../dto/super-admin-analytics-charger.dto';

/** Mirrors `routes/SuperAdmin/analyticChargerRoutes.js`. */
@Controller('v1/super-admin/analytics/charger')
@UseGuards(SuperAdminAuthGuard)
export class SuperAdminAnalyticsChargerController {
  constructor(private readonly analyticsChargerService: SuperAdminAnalyticsChargerService) {}

  @Get('consumption')
  async getPowerConsumptionReport(@Query() query: SuperAdminAnalyticsChargerFilterDto) {
    return this.analyticsChargerService.powerConsumption(query);
  }

  @Get('analytics')
  async getChargerAnalytics(@Query() query: SuperAdminAnalyticsChargerFilterDto) {
    return this.analyticsChargerService.getChargerAnalytics(query);
  }

  @Get('energy-consumption-past-week')
  async getEnergyConsumptionOfPastWeek(@Query() query: SuperAdminAnalyticsChargerFilterDto) {
    return this.analyticsChargerService.getEnergyConsumptionOfPastWeek(query);
  }

  @Get('charging-sessions-past-week')
  async getSessionsOfPastWeekReport(@Query() query: SuperAdminAnalyticsChargerFilterDto) {
    return this.analyticsChargerService.getSessionsOfPastWeekReport(query);
  }
}
