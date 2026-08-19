import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { SuperAdminAuthGuard } from '@modules/auth';
import { SuperAdminFleetDeviceTransactionService } from '../services/super-admin-fleet-device-transaction.service';

/** Mirrors `routes/SuperAdmin/fleet/index.js` (device-transaction route). */
@Controller('v1/super-admin/fleet/device-transaction')
@UseGuards(SuperAdminAuthGuard)
export class SuperAdminFleetDeviceTransactionController {
  constructor(private readonly deviceTransactionService: SuperAdminFleetDeviceTransactionService) {}

  @Get(':fleetId')
  async getDeviceTransactionsByFleetId(
    @Param('fleetId', ParseIntPipe) fleetId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('chargerId') chargerId?: string,
    @Query('vendorId') vendorId?: string,
    @Query('stationId') stationId?: string,
  ) {
    return this.deviceTransactionService.getDeviceTransactionsByFleetId(fleetId, { search, chargerId, vendorId, stationId }, Number(page) || 1, Number(limit) || 200);
  }
}
