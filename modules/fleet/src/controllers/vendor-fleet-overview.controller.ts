import { Controller, Get, Param, ParseIntPipe, Query, Req, UseGuards } from '@nestjs/common';
import { VendorAuthGuard } from '@modules/auth';
import { VendorFleetOverviewService } from '../services/vendor-fleet-overview.service';

/** Mirrors `routes/vendor/fleet/overViewRoutes.js` + `controllers/vendors/Fleet/overviewController.js`. */
@Controller('v1/vendor/fleet/overview')
@UseGuards(VendorAuthGuard)
export class VendorFleetOverviewController {
  constructor(private readonly overviewService: VendorFleetOverviewService) {}

  private vendorId(req: any): number {
    return Number(req.vendor?.vendorId || req.user?.id || 0);
  }

  @Get('card/:fleetId')
  async cardCounts(@Req() req: any, @Param('fleetId', ParseIntPipe) fleetId: number) {
    return this.overviewService.cardCounts(fleetId, this.vendorId(req));
  }

  @Get('revenue/:fleetId')
  async getEachMonthRevenueByfleetId(
    @Req() req: any,
    @Param('fleetId', ParseIntPipe) fleetId: number,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('stationId') stationId?: string,
    @Query('chargerId') chargerId?: string,
  ) {
    return this.overviewService.getEachMonthRevenueByFleetId(fleetId, this.vendorId(req), { month, year, stationId, chargerId });
  }

  @Get('consumption/:fleetId')
  async getEachMonthConsumptionByfleetId(
    @Req() req: any,
    @Param('fleetId', ParseIntPipe) fleetId: number,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('stationId') stationId?: string,
    @Query('chargerId') chargerId?: string,
  ) {
    return this.overviewService.getEachMonthConsumptionByFleetId(fleetId, this.vendorId(req), { month, year, stationId, chargerId });
  }
}
