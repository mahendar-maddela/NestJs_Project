import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { VendorAuthGuard, VendorFeaturesGuard, VendorFeatureRequired } from '@modules/auth';
import { VendorChargerService } from '../services/vendor-charger.service';

/** Mirrors `routes/vendor/chargerRoutes.js` + `controllers/vendors/chargerController.js`. */
@Controller('v1/vendor/charger')
@UseGuards(VendorAuthGuard)
export class VendorChargerController {
  constructor(private readonly chargerService: VendorChargerService) {}

  private vendorId(req: any): number {
    return Number(req.vendor?.vendorId || req.user?.id );
  }

  @Get('log/:chargerId')
  @UseGuards(VendorFeaturesGuard)
  @VendorFeatureRequired('Charger Logs')
  async chargerDeviceLogs(@Req() req: any, @Param('chargerId') chargerId: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.chargerService.chargerDeviceLogs(chargerId, this.vendorId(req), Number(page) || 1, Number(limit) || 200);
  }

  @Get('station/:stationId')
  async getAllChargersByStationId(@Req() req: any, @Param('stationId') stationId: string) {
    return this.chargerService.getAllChargersByStationId(Number(stationId), this.vendorId(req));
  }

  @Get('device-transaction/:id')
  async getAllDeviceTransactionByChargerId(
    @Req() req: any,
    @Param('id') id: string,
    @Query('connector') connector?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chargerService.getAllDeviceTransactionByChargerId(id, this.vendorId(req), connector, Number(page) || 1, Number(limit) || 200);
  }

  @Get('vendor/all')
  async getAllChargersVendor(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('powerType') powerType?: string,
    @Query('search') search?: string,
    @Query('stationId') stationId?: string,
  ) {
    return this.chargerService.getAllChargersVendor(
      this.vendorId(req),
      page ? Number(page) : null,
      limit ? Number(limit) : null,
      powerType,
      search,
      stationId,
    );
  }

  @Get('logs/download/:chargerId')
  async getLogsDateWise(@Req() req: any, @Param('chargerId') chargerId: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.chargerService.getLogsDateWise(chargerId, this.vendorId(req), from, to);
  }

  @Get(':id')
  async getChargerById(@Req() req: any, @Param('id') id: string) {
    return this.chargerService.getChargerById(id, this.vendorId(req));
  }
}
