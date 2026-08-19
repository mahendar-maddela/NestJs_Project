import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { FleetAuthGuard } from '@modules/auth';
import { DriverDeviceTransactionService } from '../services/driver-device-transaction.service';

/** Mirrors `routes/app/fleet/driverauthRoutes.js` (device-transaction + assigned-vehicle pieces). */
@Controller('v1/fleet')
@UseGuards(FleetAuthGuard)
export class DriverDeviceTransactionController {
  constructor(private readonly deviceTransactionService: DriverDeviceTransactionService) {}

  @Get('assigned-vehicle')
  async getDriverAssignedVehicle(@Req() req: any) {
    return this.deviceTransactionService.getDriverAssignedVehicle(Number(req.user.id));
  }

  @Get('transaction')
  async getAlldeviceTransaction(@Req() req: any, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.deviceTransactionService.getAlldeviceTransaction(Number(req.user.fleetId), Number(req.user.id), Number(page) || 1, Number(limit) || 100);
  }

  @Get('running-transaction')
  async runningTransactionData(@Req() req: any) {
    return this.deviceTransactionService.runningTransactionData(Number(req.user.fleetId), Number(req.user.id));
  }

  @Get('running/:id')
  async singleRunnigData(@Param('id') id: string) {
    return this.deviceTransactionService.singleRunnigData(id);
  }
}
