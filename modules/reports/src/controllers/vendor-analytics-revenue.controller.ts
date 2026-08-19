import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { VendorAuthGuard, VendorFeaturesGuard, VendorFeatureRequired } from '@modules/auth';
import { VendorAnalyticsRevenueService } from '../services/vendor-analytics-revenue.service';

/** Mirrors `routes/vendor/analyticsRevenueRoutes.js` + `controllers/vendors/AnalyticsRevenueController.js`. */
@Controller('v1/vendor/analytics-revenue')
@UseGuards(VendorAuthGuard, VendorFeaturesGuard)
@VendorFeatureRequired('Analytics')
export class VendorAnalyticsRevenueController {
  constructor(private readonly analyticsService: VendorAnalyticsRevenueService) {}

  private vendorId(req: any): number {
    return Number(req.vendor?.vendorId || req.user?.id || 0);
  }

  private clientId(req: any): number {
    return Number(req.vendor?.clientId || req.user?.clientId || req.headers['x-client-id'] || 0);
  }

  @Get('card')
  async analyticsRevenueCard(@Req() req: any, @Query('stationId') stationId?: string, @Query('chargerId') chargerId?: string, @Query('year') year?: string) {
    return this.analyticsService.analyticsRevenueCard(this.clientId(req), this.vendorId(req), { stationId, chargerId, year });
  }

  @Get('consumption/card')
  async analyticsConsumptionCard(
    @Req() req: any,
    @Query('stationId') stationId?: string,
    @Query('chargerId') chargerId?: string,
    @Query('year') year?: string,
  ) {
    return this.analyticsService.analyticsConsumptionCard(this.clientId(req), this.vendorId(req), { stationId, chargerId, year });
  }

  @Get('week')
  async last7DaysPerformance(@Req() req: any, @Query('stationId') stationId?: string, @Query('chargerId') chargerId?: string) {
    return this.analyticsService.last7DaysPerformance(this.clientId(req), this.vendorId(req), { stationId, chargerId });
  }

  @Get('year')
  async getYearlyRevenue(
    @Req() req: any,
    @Query('stationId') stationId?: string,
    @Query('chargerId') chargerId?: string,
    @Query('year') year?: string,
    @Query('isUnits') isUnits?: string,
  ) {
    return this.analyticsService.getYearlyRevenue(this.clientId(req), this.vendorId(req), { stationId, chargerId, year, isUnits });
  }

  @Get('each-month/revenue')
  async getEachMonthRevenue(
    @Req() req: any,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('stationId') stationId?: string,
    @Query('chargerId') chargerId?: string,
  ) {
    return this.analyticsService.getEachMonthRevenue(this.clientId(req), this.vendorId(req), { month, year, stationId, chargerId });
  }

  @Get('each-month/consumption')
  async getEachMonthConsumption(
    @Req() req: any,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('stationId') stationId?: string,
    @Query('chargerId') chargerId?: string,
  ) {
    return this.analyticsService.getEachMonthConsumption(this.clientId(req), this.vendorId(req), { month, year, stationId, chargerId });
  }

  @Get('each-month/transaction')
  async getEachMonthTransactionCount(
    @Req() req: any,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('stationId') stationId?: string,
    @Query('chargerId') chargerId?: string,
  ) {
    return this.analyticsService.getEachMonthTransactionCount(this.clientId(req), this.vendorId(req), { month, year, stationId, chargerId });
  }

  @Get('each-month')
  async getEachMonthAnalytics(
    @Req() req: any,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('stationId') stationId?: string,
    @Query('chargerId') chargerId?: string,
    @Query('fleetId') fleetId?: string,
  ) {
    return this.analyticsService.getEachMonthAnalytics(this.clientId(req), this.vendorId(req), { month, year, stationId, chargerId, fleetId });
  }

  @Get('station-charger')
  async getAllStationWithStation(@Req() req: any) {
    return this.analyticsService.getAllStationWithStation(this.vendorId(req));
  }

  @Get('today/:chargerId')
  async getTodayRevenue(@Req() req: any, @Param('chargerId') chargerId: string) {
    return this.analyticsService.getTodayRevenue(chargerId, this.vendorId(req));
  }

  @Get('monthly/:chargerId')
  async getMonthlyRevenue(@Req() req: any, @Param('chargerId') chargerId: string, @Query('month') month?: string, @Query('year') year?: string) {
    return this.analyticsService.getMonthlyRevenue(chargerId, this.vendorId(req), month, year);
  }
}
