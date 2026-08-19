import { Injectable, NotFoundException } from '@nestjs/common';
import { DriverDeviceTransactionRepository } from '../repositories/driver-device-transaction.repository';

/** Mirrors `controllers/APP/FleetDriver/DeviceTransactionController.js`. */
@Injectable()
export class DriverDeviceTransactionService {
  constructor(private readonly repo: DriverDeviceTransactionRepository) {}

  async getAlldeviceTransaction(fleetId: number, fleetUserId: number, page: number, limit: number) {
    const [rows, count] = await this.repo.findAndCountByDriver(fleetId, fleetUserId, (page - 1) * limit, limit);
    return {
      success: true,
      message: 'Device transactions fetched successfully',
      data: rows,
      pagination: { totalPages: Math.ceil(count / limit), page },
    };
  }

  async runningTransactionData(fleetId: number, fleetUserId: number) {
    const sessions = await this.repo.findRunningSessionsByDriver(fleetId, fleetUserId);
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

  async getDriverAssignedVehicle(fleetUserId: number) {
    const now = new Date();
    const today = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const currentTime = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false });

    const assignedVehicle = await this.repo.findAssignedVehicle(fleetUserId, today, currentTime);

    if (assignedVehicle) {
      return { success: true, message: 'Assiged Vehicle Fetched Successfully', data: assignedVehicle };
    }
    // Legacy returns `success: true` even on the not-found branch — preserved as-is.
    throw new NotFoundException({ success: true, message: 'No Vehicle Assigned at the moment !' });
  }
}
