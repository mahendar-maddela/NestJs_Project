import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { SuperAdminAuthGuard } from '@modules/auth';
import { AdminDeviceTransactionService } from '../../../sessions/src/services/admin-device-transaction.service';
import { SuperAdminDeviceTransactionService } from '../services/super-admin-device-transaction.service';
import { SuperAdminDeviceTransactionQueryDto } from '../dto/super-admin-device-transaction.dto';

/** Mirrors `routes/SuperAdmin/deviceTransactionRoutes.js`. */
@Controller('v1/super-admin/device-transactions')
@UseGuards(SuperAdminAuthGuard)
export class SuperAdminDeviceTransactionController {
  constructor(
    private readonly deviceTransactionService: SuperAdminDeviceTransactionService,
    private readonly adminDeviceTransactionService: AdminDeviceTransactionService,
  ) {}

  @Get()
  async getAllClientDeviceTransactions(@Query() query: SuperAdminDeviceTransactionQueryDto) {
    return this.deviceTransactionService.getAllClientDeviceTransactions(query);
  }

  @Get('meter/:id')
  async getAllMeterTransactions(@Param('id', ParseIntPipe) id: number, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.adminDeviceTransactionService.getAllMeterTransactions(id, Number(page) || 1, Number(limit) || 200);
  }

  @Get(':chargerId')
  async getTransactionsByCharger(@Param('chargerId', ParseIntPipe) chargerId: number, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.deviceTransactionService.getTransactionsByCharger(chargerId, Number(page) || 1, Number(limit) || 200);
  }
}
