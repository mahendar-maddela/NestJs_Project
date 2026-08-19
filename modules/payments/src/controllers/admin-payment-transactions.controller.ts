import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { AdminPaymentTransactionsService } from '../services/admin-payment-transactions.service';
import { AdminAuthGuard, StaffPermissionsGuard, StaffPermission } from '@modules/auth';

@Controller('v1/admin/payment-transaction')
@UseGuards(AdminAuthGuard, StaffPermissionsGuard)
export class AdminPaymentTransactionsController {
  constructor(private readonly adminPaymentTxService: AdminPaymentTransactionsService) {}

  @Get()
  @StaffPermission('Payment_Transaction_View')
  async getAllPaymentTransactions(@Req() req: any, @Query() query: any) {
    const clientId = Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 1);
    return this.adminPaymentTxService.getAllPaymentTransactions(query, clientId);
  }

  @Get('download')
  @StaffPermission('Payment_Transaction_View')
  async downloadPaymentTransactions(@Req() req: any, @Query() query: any) {
    const clientId = Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 1);
    return this.adminPaymentTxService.downloadPaymentTransactions(query, clientId);
  }
}
