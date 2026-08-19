import { Injectable } from '@nestjs/common';
import { AdminPaymentTransactionsRepository } from '../repositories/admin-payment-transactions.repository';

function getISTDateRangeInUTC(fromDateStr: string, toDateStr: string): { startDate: Date; endDate: Date } {
  const startLocalStr = fromDateStr.includes('T') ? fromDateStr : `${fromDateStr}T00:00:00+05:30`;
  const endLocalStr = toDateStr.includes('T') ? toDateStr : `${toDateStr}T23:59:59.999+05:30`;
  return {
    startDate: new Date(startLocalStr),
    endDate: new Date(endLocalStr),
  };
}

@Injectable()
export class AdminPaymentTransactionsService {
  constructor(private readonly adminPaymentTxRepository: AdminPaymentTransactionsRepository) {}

  async getAllPaymentTransactions(query: any, clientId: number) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.max(1, parseInt(query.limit) || 200);
    const offset = (page - 1) * limit;
    const { search, fromDate, toDate, status } = query;

    const condition: any = { clientId };

    if (search) {
      condition.OR = [
        { status: { contains: search } },
        { orderId: { contains: search } },
        { paymentId: { contains: search } },
        { user: { userId: { contains: search } } },
        { user: { first_name: { contains: search } } },
        { fleetUserDetail: { fleetUId: { contains: search } } },
        { fleetUserDetail: { cName: { contains: search } } },
      ];
    }

    if (fromDate && toDate) {
      const { startDate, endDate } = getISTDateRangeInUTC(fromDate, toDate);
      condition.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    if (status) {
      condition.status = status;
    }

    const { count, rows } = await this.adminPaymentTxRepository.findAndCountAll(condition, offset, limit);
    const totalPages = Math.ceil(count / limit);

    return {
      success: true,
      message: 'Payment transactions fetched successfully',
      data: rows,
      pagination: {
        totalPages,
        page,
      },
    };
  }

  async downloadPaymentTransactions(query: any, clientId: number) {
    const { startDate: fromDate, endDate: toDate, status } = query;

    const condition: any = { clientId };

    if (fromDate && toDate) {
      const { startDate, endDate } = getISTDateRangeInUTC(fromDate, toDate);
      condition.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    if (status) {
      condition.status = status;
    }

    const transactions = await this.adminPaymentTxRepository.findAllForDownload(condition);

    return {
      success: true,
      message: 'Payment transactions fetched successfully',
      data: transactions,
    };
  }
}
