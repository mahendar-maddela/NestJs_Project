import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { UserAuthGuard } from '@modules/auth';
import { UserDeviceTransactionService } from '../services/user-device-transaction.service';

/** Mirrors `routes/Web/deviceTransactionRoutes.js`. */
@Controller('v1/web/device-transaction')
@UseGuards(UserAuthGuard)
export class WebDeviceTransactionController {
  constructor(private readonly deviceTransactionService: UserDeviceTransactionService) {}

  @Get()
  async getAlldeviceTransaction(@Req() req: any, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.deviceTransactionService.getAlldeviceTransaction(req.user.id, Number(page) || 1, Number(limit) || 100);
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
