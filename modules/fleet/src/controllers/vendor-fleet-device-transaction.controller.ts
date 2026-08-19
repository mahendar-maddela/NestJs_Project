import { Controller, Get, Param, ParseIntPipe, Query, Req, UseGuards } from '@nestjs/common';
import { VendorAuthGuard } from '@modules/auth';
import { VendorFleetDeviceTransactionService } from '../services/vendor-fleet-device-transaction.service';

/** Mirrors `routes/vendor/fleet/deviceTransactionRoutes.js` + `controllers/vendors/Fleet/deviceTransactionController.js`. */
@Controller('v1/vendor/fleet/device-transaction')
@UseGuards(VendorAuthGuard)
export class VendorFleetDeviceTransactionController {
  constructor(private readonly deviceTransactionService: VendorFleetDeviceTransactionService) {}

  private vendorId(req: any): number {
    return Number(req.vendor?.vendorId || req.user?.id || 0);
  }

  private clientId(req: any): number {
    return Number(req.vendor?.clientId || req.user?.clientId || req.headers['x-client-id'] || 0);
  }

  @Get(':fleetId')
  async getAllFleetDeviceTransactions(
    @Req() req: any,
    @Param('fleetId', ParseIntPipe) fleetId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('chargerId') chargerId?: string,
    @Query('stationId') stationId?: string,
  ) {
    return this.deviceTransactionService.getAllFleetDeviceTransactions(
      fleetId,
      this.vendorId(req),
      this.clientId(req),
      search,
      chargerId,
      stationId,
      Number(page) || 1,
      Number(limit) || 200,
    );
  }
}
