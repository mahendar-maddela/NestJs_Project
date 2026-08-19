import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { UserAuthGuard } from '@modules/auth';
import { UserDeviceTransactionService } from '../services/user-device-transaction.service';

/** Mirrors `routes/app/deviceTransactionsRoutes.js`. */
@Controller('v1/device-transactions')
@UseGuards(UserAuthGuard)
export class AppDeviceTransactionController {
  constructor(private readonly deviceTransactionService: UserDeviceTransactionService) {}

  @Get()
  async getAllDeviceTransactions(@Req() req: any, @Query('page') page?: string, @Query('limit') limit?: string, @Query('status') status?: string) {
    return this.deviceTransactionService.getAllDeviceTransactions(req.user.id, Number(page) || 1, Number(limit) || 10, status);
  }

  @Get('running-transaction')
  async runningTransactionData(@Req() req: any) {
    return this.deviceTransactionService.runningTransactionData(req.user.id);
  }

  @Get('running/:id')
  async singleRunnigData(@Param('id') id: string) {
    return this.deviceTransactionService.singleRunnigData(id);
  }
}
