import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { FleetAuthGuard } from '@modules/auth';
import { FleetAnalyticsService } from '../services/fleet-analytics.service';
import { FleetAnalyticsQueryDto } from '../dto/fleet-analytics.dto';

/** Mirrors `routes/Fleet/analyticsRoutes.js`. */
@Controller('v1/fleet/analytics')
@UseGuards(FleetAuthGuard)
export class FleetAnalyticsController {
  constructor(private readonly analyticsService: FleetAnalyticsService) {}

  private fleetId(req: any): number {
    return Number(req.user.fleetId);
  }

  @Get('months')
  async getEachMonthsData(@Req() req: any, @Query() query: FleetAnalyticsQueryDto) {
    return this.analyticsService.getEachMonthsData(this.fleetId(req), query);
  }

  @Get('card')
  async totalCradsData(@Req() req: any, @Query() query: FleetAnalyticsQueryDto) {
    return this.analyticsService.totalCradsData(this.fleetId(req), query);
  }

  @Get('week-amount')
  async amountSpendingWeekPerformance(@Req() req: any, @Query() query: FleetAnalyticsQueryDto) {
    return this.analyticsService.amountSpendingWeekPerformance(this.fleetId(req), query);
  }

  @Get('week-consumption')
  async consumptionWeekPerformance(@Req() req: any, @Query() query: FleetAnalyticsQueryDto) {
    return this.analyticsService.consumptionWeekPerformance(this.fleetId(req), query);
  }

  @Get('station')
  async getAllStationsByFleetUsed(@Req() req: any) {
    return this.analyticsService.getAllStationsByFleetUsed(this.fleetId(req));
  }
}

/** Mirrors `routes/Fleet/overViewRoutes.js`. */
@Controller('v1/fleet/over-view')
@UseGuards(FleetAuthGuard)
export class FleetOverviewController {
  constructor(private readonly analyticsService: FleetAnalyticsService) {}

  private fleetId(req: any): number {
    return Number(req.user.fleetId);
  }

  @Get('vehicle')
  async topConsumptionVehicles(@Req() req: any) {
    return this.analyticsService.topConsumptionVehicles(this.fleetId(req));
  }

  @Get('time-wise')
  async timeWiseConsumptions(@Req() req: any) {
    return this.analyticsService.timeWiseConsumptions(this.fleetId(req));
  }

  @Get('card')
  async consumptionCrad(@Req() req: any, @Query('year') year?: string) {
    return this.analyticsService.consumptionCrad(this.fleetId(req), year);
  }
}
