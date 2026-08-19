import { Injectable } from '@nestjs/common';
import { SuperAdminTransactionsRepository } from '../repositories/super-admin-transactions.repository';

@Injectable()
export class SuperAdminTransactionsService {
  constructor(private readonly repository: SuperAdminTransactionsRepository) {}

  async getPaymentTransactions(query: {
    page?: string;
    limit?: string;
    clientId?: string;
    search?: string;
    status?: string;
  }) {
    const pageNum = Math.max(1, Number(query.page) || 1);
    const limitNum = Math.max(1, Number(query.limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      ...(query.clientId ? { clientId: Number(query.clientId) } : {}),
      ...(query.status ? { status: query.status as any } : {}),
      ...(query.search
        ? {
            OR: [
              { orderId: { contains: query.search } },
              { paymentId: { contains: query.search } },
              { utr: { contains: query.search } },
            ],
          }
        : {}),
    };

    const { total, data } = await this.repository.findAndCountPaymentTransactions(where, skip, limitNum);

    return {
      success: true,
      message: 'Payment transactions fetched successfully',
      data,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async getWalletTransactions(query: {
    page?: string;
    limit?: string;
    clientId?: string;
    search?: string;
  }) {
    const pageNum = Math.max(1, Number(query.page) || 1);
    const limitNum = Math.max(1, Number(query.limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      ...(query.clientId ? { clientId: Number(query.clientId) } : {}),
      ...(query.search ? { refNo: { contains: query.search } } : {}),
    };

    const { total, data } = await this.repository.findAndCountWalletTransactions(where, skip, limitNum);

    return {
      success: true,
      message: 'Wallet transactions fetched successfully',
      data,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }
}
