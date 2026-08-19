import { Injectable } from '@nestjs/common';
import { AdminWalletTransactionRepository } from '../repositories/admin-wallet-transaction.repository';
import { getIstDateRangeInUtc } from '@app/common';

export interface WalletTransactionQuery {
  page?: string;
  limit?: string;
  vendorType?: string;
  vendorId?: string;
  search?: string;
  userId?: string;
  fromDate?: string;
  toDate?: string;
  staff?: string;
}

/** Mirrors `controllers/admin/walletTransactionController.js:getALlWalletTransactions`. */
@Injectable()
export class AdminWalletTransactionService {
  constructor(private readonly repo: AdminWalletTransactionRepository) {}

  async getAllWalletTransactions(clientId: number, query: WalletTransactionQuery) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 200;
    const skip = (page - 1) * limit;

    let dateRange: { startDate: Date; endDate: Date } | undefined;
    if (query.fromDate && query.toDate) {
      dateRange = getIstDateRangeInUtc(query.fromDate, query.toDate);
    }

    const [rows, count] = await this.repo.findAndCountPaginated(
      {
        clientId,
        vendorType: query.vendorType ? Number(query.vendorType) : undefined,
        vendorId: query.vendorId ? Number(query.vendorId) : undefined,
        search: query.search,
        fromDate: dateRange?.startDate,
        toDate: dateRange?.endDate,
        staff: Boolean(query.staff),
      },
      skip,
      limit,
    );

    return {
      success: true,
      message: 'Wallet transactions fetched successfully',
      data: rows,
      pagination: { totalPages: Math.ceil(count / limit), page },
    };
  }
}
