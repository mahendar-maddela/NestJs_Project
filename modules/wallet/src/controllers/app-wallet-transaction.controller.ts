import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { UserAuthGuard } from '@modules/auth';
import { AppWalletTransactionService } from '../services/app-wallet-transaction.service';

/** Mirrors `routes/app/walletTransactionsRoutes.js`. */
@Controller('v1/transactions')
@UseGuards(UserAuthGuard)
export class AppWalletTransactionController {
  constructor(private readonly walletTransactionService: AppWalletTransactionService) {}

  @Get()
  async getWalletTransaction(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('today') today?: string,
    @Query('credit') credit?: string,
    @Query('debit') debit?: string,
  ) {
    return this.walletTransactionService.getWalletTransaction(req.user.id, Number(page) || 1, Number(limit) || 200, Boolean(today), Boolean(credit), Boolean(debit));
  }
}
