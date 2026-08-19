import { Controller, Get, Param, ParseIntPipe, Query, Req, UseGuards } from '@nestjs/common';
import { AdminAuthGuard, ClientFeaturesGuard, ClientFeatureRequired, StaffPermissionsGuard, StaffPermission } from '@modules/auth';
import { AdminDeviceTransactionService } from '../../../sessions/src/services/admin-device-transaction.service';

/** Mirrors `routes/admin/fleet/deviceTransactionRoutes.js` + `controllers/admin/fleet/deviceTransactionController.js`. */
@Controller('v1/admin/fleet/device-transaction')
@UseGuards(AdminAuthGuard, ClientFeaturesGuard, StaffPermissionsGuard)
@ClientFeatureRequired('Fleet Module')
@StaffPermission('Fleet_View')
export class AdminFleetDeviceTransactionController {
  constructor(private readonly deviceTransactionService: AdminDeviceTransactionService) {}

  private clientId(req: any): number {
    return Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 0);
  }

  @Get(':fleetId')
  async getAllDeviceTransactions(
    @Req() req: any,
    @Param('fleetId', ParseIntPipe) fleetId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('chargerId') chargerId?: string,
    @Query('vendorId') vendorId?: string,
    @Query('stationId') stationId?: string,
  ) {
    return this.deviceTransactionService.getAllDeviceTransactionsByFleet(
      fleetId,
      this.clientId(req),
      { search, chargerId, vendorId, stationId },
      Number(page) || 1,
      Number(limit) || 200,
    );
  }
}
