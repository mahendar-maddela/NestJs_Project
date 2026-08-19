import { Controller, Get, Param, ParseIntPipe, Query, Req, UseGuards } from '@nestjs/common';
import { AdminAuthGuard, StaffPermissionsGuard, StaffPermission } from '@modules/auth';
import { AdminDeviceTransactionService } from '../services/admin-device-transaction.service';
import { DeviceTransactionQueryDto } from '../dto/admin-device-transaction.dto';

/** Mirrors `routes/admin/deviceTransactionRoutes.js` + `controllers/admin/deviceTransactionController.js`. */
@Controller('v1/admin/device-transaction')
@UseGuards(AdminAuthGuard, StaffPermissionsGuard)
export class AdminDeviceTransactionController {
  constructor(private readonly deviceTransactionService: AdminDeviceTransactionService) {}

  private clientId(req: any): number {
    return Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] );
  }

  @Get()
  @StaffPermission('Session_View')
  async getAllDeviceTransactions(@Req() req: any, @Query() query: DeviceTransactionQueryDto) {
    return this.deviceTransactionService.getAllDeviceTransactions(this.clientId(req), query);
  }

  @Get('meter/:id')
  async getAllMeterTransactions(
    @Param('id', ParseIntPipe) transactionId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.deviceTransactionService.getAllMeterTransactions(transactionId, Number(page) || 1, Number(limit) || 200);
  }

  @Get(':id')
  async getDeviceTransactionsByChargerId(
    @Req() req: any,
    @Param('id', ParseIntPipe) chargerRef: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.deviceTransactionService.getDeviceTransactionsByChargerId(
      this.clientId(req),
      chargerRef,
      Number(page) || 1,
      Number(limit) || 200,
    );
  }
}
