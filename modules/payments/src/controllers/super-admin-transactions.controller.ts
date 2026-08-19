import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SuperAdminAuthGuard } from '@modules/auth';
import { SuperAdminTransactionsService } from '../services/super-admin-transactions.service';

@Controller('v1/super-admin/transactions')
@UseGuards(SuperAdminAuthGuard)
export class SuperAdminTransactionsController {
  constructor(private readonly service: SuperAdminTransactionsService) {}

  @Get('payment')
  async getPaymentTransactions(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('clientId') clientId?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.service.getPaymentTransactions({ page, limit, clientId, search, status });
  }

  @Get('wallet')
  async getWalletTransactions(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('clientId') clientId?: string,
    @Query('search') search?: string,
  ) {
    return this.service.getWalletTransactions({ page, limit, clientId, search });
  }
}
