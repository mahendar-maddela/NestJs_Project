import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AdminWalletTransactionService, WalletTransactionQuery } from '../services/admin-wallet-transaction.service';
import { AdminAuthGuard, StaffPermissionsGuard, StaffPermission } from '@modules/auth';

@Controller('v1/admin/wallet-transaction')
@UseGuards(AdminAuthGuard, StaffPermissionsGuard)
export class AdminWalletTransactionController {
  constructor(private readonly adminWalletTransactionService: AdminWalletTransactionService) {}

  @Get()
  @StaffPermission('Wallet_Transaction_View')
  async getAllWalletTransactions(@Req() req: any, @Query() query: WalletTransactionQuery) {
    const clientId = Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 0);
    return this.adminWalletTransactionService.getAllWalletTransactions(clientId, query);
  }
}
