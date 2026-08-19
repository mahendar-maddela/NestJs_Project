import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { VendorAuthGuard, VendorFeaturesGuard, VendorFeatureRequired } from '@modules/auth';
import { VendorAnalyticsChargerService } from '../services/vendor-analytics-charger.service';

/** Mirrors `routes/vendor/analyticsChargerRoutes.js` + `controllers/vendors/AnalyticsChargerController.js`. */
@Controller('v1/vendor/analytics-charger')
@UseGuards(VendorAuthGuard, VendorFeaturesGuard)
@VendorFeatureRequired('Analytics')
export class VendorAnalyticsChargerController {
  constructor(private readonly analyticsService: VendorAnalyticsChargerService) {}

  private vendorId(req: any): number {
    return Number(req.vendor?.vendorId || req.user?.id || 0);
  }

  @Get('total-power/:chargerId')
  async totalPowerConsumption(@Req() req: any, @Param('chargerId') chargerId: string) {
    return this.analyticsService.totalPowerConsumption(chargerId, this.vendorId(req));
  }

  @Get('today-power/:chargerId')
  async todayPowerConsumption(@Req() req: any, @Param('chargerId') chargerId: string) {
    return this.analyticsService.todayPowerConsumption(chargerId, this.vendorId(req));
  }

  @Get('total-transactions/:chargerId')
  async getTotalTransactions(@Req() req: any, @Param('chargerId') chargerId: string) {
    return this.analyticsService.getTotalTransactions(chargerId, this.vendorId(req));
  }

  @Get('today-transactions/:chargerId')
  async todayTotalTransactions(@Req() req: any, @Param('chargerId') chargerId: string) {
    return this.analyticsService.todayTotalTransactions(chargerId, this.vendorId(req));
  }

  @Get('energy-consumption-past-week/:chargerId')
  async getEnergyConsumptionOfPastWeek(@Req() req: any, @Param('chargerId') chargerId: string) {
    return this.analyticsService.getEnergyConsumptionOfPastWeek(chargerId, this.vendorId(req));
  }

  @Get('charging-sessions-past-week/:chargerId')
  async getChargingSessionsOfPastWeek(@Req() req: any, @Param('chargerId') chargerId: string) {
    return this.analyticsService.getChargingSessionsOfPastWeek(chargerId, this.vendorId(req));
  }

  @Get('charger-analytics/:chargerId')
  async getChargerAnalytics(@Req() req: any, @Param('chargerId') chargerId: string) {
    return this.analyticsService.getChargerAnalytics(chargerId, this.vendorId(req));
  }
}
