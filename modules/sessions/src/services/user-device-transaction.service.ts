import { Injectable, NotFoundException } from '@nestjs/common';
import { UserDeviceTransactionRepository } from '../repositories/user-device-transaction.repository';

/** Mirrors `controllers/Web/deviceTransactionController.js` + `controllers/APP/deviceTransactions.js`. Shared by the web and app (driver) actors. */
@Injectable()
export class UserDeviceTransactionService {
  constructor(private readonly repo: UserDeviceTransactionRepository) {}

  async getAlldeviceTransaction(userId: number, page: number, limit: number) {
    const [rows, count] = await this.repo.findAndCountByUser(userId, (page - 1) * limit, limit);
    return {
      success: true,
      message: 'Device transactions fetched successfully',
      data: rows,
      pagination: { totalPages: Math.ceil(count / limit), page },
    };
  }

  async getAllDeviceTransactions(userId: number, page: number, limit: number, status: string | undefined) {
    const [transactions, localCount] = await this.repo.findAndCountByUserWithCharger(userId, status, (page - 1) * limit, limit);

    let range: { start: Date; end: Date } | undefined;
    if (transactions.length > 0) {
      const createdAts = transactions.map((t) => t.createdAt).sort((a, b) => a.getTime() - b.getTime());
      range = { start: createdAts[0], end: createdAts[createdAts.length - 1] };
    }

    const ocpiRows = await this.repo.findOcpiTransactionsForUser(userId, status, range);
    const [totalPrice, totalWh] = await Promise.all([this.repo.sumPriceByUser(userId), this.repo.sumTotalWhByUser(userId)]);

    if (ocpiRows.length) {
      const mappedOcpi = ocpiRows.map((item: any) => ({
        id: item.id,
        transactionId: item.session_id,
        connectorId: item.connector_id || null,
        startDate: item.createdAt || null,
        macId: null,
        stopDate: item.end_date_time || null,
        status: item.status === 'COMPLETED' ? 1 : 0,
        charginDuration: null,
        price: item.total_price || 0,
        totalWh: (item.kwh || 0) * 1000,
        startSoc: item.startSoc || null,
        stopSoc: item.stopSoc || null,
        createdAt: item.createdAt,
        charger: {
          id: null,
          chargerId: item.evse_uid || null,
          capacity: null,
          powerType: null,
          status: null,
          station: {
            id: null,
            name: item.evse?.location?.name || null,
            stationUniqueId: null,
            stationLocation: {
              address: item.evse?.location?.address || null,
              city: item.evse?.location?.city || null,
              state: null,
              country: null,
              pincode: null,
            },
          },
        },
        session: item.sessions?.[0] ? { sessionId: item.sessions[0].sessionId, id: item.sessions[0].id } : null,
        type: 'OCPI',
      }));

      const mappedLocal = transactions.map((t) => ({ ...t }));
      const combinedTransactions = [...mappedLocal, ...mappedOcpi].sort(
        (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      return {
        success: true,
        message: 'Device transactions fetched successfully',
        data: { transactions: combinedTransactions, totalPrice, totalWh },
        pagination: { totalPages: Math.ceil(localCount / limit), page },
      };
    }

    return {
      success: true,
      message: 'Device transactions fetched successfully',
      data: { transactions, totalPrice, totalWh },
      pagination: { totalPages: Math.ceil(localCount / limit), page },
    };
  }

  async runningTransactionData(userId: number) {
    const sessions: any[] = await this.repo.findRunningSessionsByUser(userId);
    const ocpiSessions = await this.repo.findActiveOcpiSessionsByUser(userId);

    for (const item of ocpiSessions as any[]) {
      sessions.push({
        sessionId: item.session_id,
        chargerId: item.evse_id || null,
        connectorId: null,
        transaction: { transactionId: item.transaction?.session_id || null },
        type: 'OCPI',
      });
    }

    if (!sessions.length) {
      throw new NotFoundException({ success: false, message: 'No running transactions found' });
    }

    return { success: true, message: 'Running transaction data fetched successfully', data: sessions };
  }

  async singleRunnigData(sessionId: string) {
    const session: any = await this.repo.findSessionWithTransactionBySessionId(sessionId);
    if (!session || !session.transaction) {
      throw new NotFoundException({ message: 'Session or transaction not found' });
    }

    const transaction = session.transaction;
    const runningTransactions = await this.repo.findLatestTransactionDetail(transaction.transactionId);
    const connectors = await this.repo.findConnectors(transaction.connectorId, transaction.chargerRef);

    const combinedData = {
      ...session,
      connectorDetails: connectors,
      latestTransactionDetail: runningTransactions
        ? { ...runningTransactions, currentImportEv: ((runningTransactions.currentImportEv ?? 0) * (runningTransactions.voltageEv ?? 0)) / 1000 }
        : null,
    };

    return { success: true, message: 'Running transaction data fetched successfully', data: combinedData };
  }
}
