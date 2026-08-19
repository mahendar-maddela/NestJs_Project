import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { UserAuthGuard } from '@modules/auth';
import { WebWalletTransactionService } from '../services/web-wallet-transaction.service';

function currentClientId(req: any): number {
  return Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 1);
}

/** Mirrors `routes/Web/walletTransactionRoutes.js`. */
@Controller('v1/web/wallet')
@UseGuards(UserAuthGuard)
export class WebWalletTransactionController {
  constructor(private readonly walletTransactionService: WebWalletTransactionService) {}

  @Get()
  async getWalletTransaction(@Req() req: any, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.walletTransactionService.getWalletTransaction(req.user.id, currentClientId(req), Number(page) || 1, Number(limit) || 100);
  }
}
