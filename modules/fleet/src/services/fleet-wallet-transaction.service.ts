import { Injectable, NotFoundException } from '@nestjs/common';
import { AdminWalletTransactionRepository } from '../../../wallet/src/repositories/admin-wallet-transaction.repository';

/** Mirrors `controllers/Fleet/walletTransaction.js`. */
@Injectable()
export class FleetWalletTransactionService {
  constructor(private readonly repo: AdminWalletTransactionRepository) {}

  async getFleetWalletTransactions(fleetId: number, page: number, limit: number, type?: string) {
    const wallet = await this.repo.findFleetWallet(fleetId);
    if (!wallet) {
      throw new NotFoundException({ success: false, message: 'Wallet not found for this fleet' });
    }

    const skip = (page - 1) * limit;
    const [rows, count] = await this.repo.findAndCountByWallet(wallet.id, type, skip, limit);

    return {
      success: true,
      message: 'Fleet wallet transactions fetched successfully',
      data: rows,
      pagination: { page, totalPages: Math.ceil(count / limit) },
    };
  }
}
