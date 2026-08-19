import { Injectable } from '@nestjs/common';
import { AdminWalletTransactionRepository } from '../repositories/admin-wallet-transaction.repository';

/** Mirrors `controllers/Web/walletTransactionController.js:getWalletTransaction`. */
@Injectable()
export class WebWalletTransactionService {
  constructor(private readonly repo: AdminWalletTransactionRepository) {}

  async getWalletTransaction(userId: number, clientId: number, page: number, limit: number) {
    const wallet = await this.repo.findUserWallet(userId, clientId);
    // Legacy dereferences `wallet.id` unguarded — preserved, since a User's wallet is always created alongside the User.
    const [rows, count] = await this.repo.findAndCountByWalletUserType(wallet!.id, clientId, (page - 1) * limit, limit);

    return {
      success: true,
      message: 'Wallet transactions fetched successfully',
      data: rows,
      pagination: { totalPages: Math.ceil(count / limit), page },
    };
  }
}
