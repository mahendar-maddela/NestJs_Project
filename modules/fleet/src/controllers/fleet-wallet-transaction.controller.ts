import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { FleetAuthGuard } from '@modules/auth';
import { FleetWalletTransactionService } from '../services/fleet-wallet-transaction.service';

/** Mirrors `routes/Fleet/walletTransactionRoute.js`. */
@Controller('v1/fleet/wallet-transaction')
@UseGuards(FleetAuthGuard)
export class FleetWalletTransactionController {
  constructor(private readonly walletTransactionService: FleetWalletTransactionService) {}

  @Get()
  async getFleetWalletTransactions(@Req() req: any, @Query('page') page?: string, @Query('limit') limit?: string, @Query('type') type?: string) {
    return this.walletTransactionService.getFleetWalletTransactions(Number(req.user.fleetId), Number(page) || 1, Number(limit) || 20, type);
  }
}
