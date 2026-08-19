import { Injectable } from '@nestjs/common';
import { AdminWalletTransactionRepository } from '../repositories/admin-wallet-transaction.repository';

/** Mirrors `controllers/APP/walletTransactionsController.js:getWalletTransaction`. */
@Injectable()
export class AppWalletTransactionService {
  constructor(private readonly repo: AdminWalletTransactionRepository) {}

  async getWalletTransaction(userId: number, page: number, limit: number, today?: boolean, credit?: boolean, debit?: boolean) {
    const wallet = await this.repo.findUserWalletNoClientScope(userId);
    // Legacy dereferences `wallet.id` unguarded — preserved, since a User's wallet is always created alongside the User.
    const [rows, count] = await this.repo.findAndCountByWalletWithCharger(wallet!.id, { today, credit, debit }, (page - 1) * limit, limit);

    return {
      success: true,
      message: 'Wallet transactions fetched successfully',
      data: rows,
      pagination: { totalPages: Math.ceil(count / limit), page },
    };
  }
}
