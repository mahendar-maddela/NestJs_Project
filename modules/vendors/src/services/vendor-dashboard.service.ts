import { Injectable, NotFoundException } from '@nestjs/common';
import { getTodayDateIstToUtc, getTodayEndDateIstToUtc } from '@app/common';
import { VendorDashboardRepository } from '../repositories/vendor-dashboard.repository';

/** Mirrors `controllers/vendors/dashboard.js`. */
@Injectable()
export class VendorDashboardService {
  constructor(private readonly repo: VendorDashboardRepository) {}

  async getListOfCount(vendorId: number) {
    const todayStart = getTodayDateIstToUtc();
    const todayEnd = getTodayEndDateIstToUtc();

    const [totalRfidUsers, totalStations, totalCharges, activeChargers] = await Promise.all([
      this.repo.countRfidUsersByVendor(vendorId),
      this.repo.countStationsByVendor(vendorId),
      this.repo.countChargersByVendor(vendorId),
      this.repo.countChargersByVendor(vendorId, 'Active'),
    ]);

    const inActiveChargers = totalCharges - activeChargers;

    const [availableConnectors, engagedConnectors, preparingConnectors, finishingConnectors, totalConnectors, faultedConnectors, unavailableConnectors] =
      await Promise.all([
        this.repo.countConnectorsByVendorAndStatus(vendorId, ['Available']),
        this.repo.countConnectorsByVendorAndStatus(vendorId, ['Engaged', 'Charging']),
        this.repo.countConnectorsByVendorAndStatus(vendorId, ['Preparing']),
        this.repo.countConnectorsByVendorAndStatus(vendorId, ['Finishing']),
        this.repo.countConnectorsByVendorAndStatus(vendorId),
        this.repo.countConnectorsByVendorAndStatus(vendorId, ['SuspendedEV', 'SuspendedEVSE', 'Faulted']),
        this.repo.countConnectorsByVendorAndStatus(vendorId, ['Unavailable']),
      ]);

    const chargers = await this.repo.findChargerIdsByVendor(vendorId);
    const chargerIds = chargers.map((c) => c.id);

    const [totalAmountSpent, totalEnergyConsumed] = await Promise.all([
      this.repo.sumDeviceTransactionField(chargerIds, 'price'),
      this.repo.sumDeviceTransactionField(chargerIds, 'totalWh'),
    ]);

    const [todaySessions, todayRevenue, todayConsumption] = await Promise.all([
      this.repo.countDeviceTransactions(chargerIds, todayStart, todayEnd, 1),
      this.repo.sumDeviceTransactionField(chargerIds, 'price', todayStart, todayEnd, 1),
      this.repo.sumDeviceTransactionField(chargerIds, 'totalWh', todayStart, todayEnd, 1),
    ]);

    return {
      success: true,
      message: 'Metrics fetched successfully',
      data: {
        totalRfidUsers,
        totalStations,
        totalCharges,
        activeChargers,
        availableConnectors,
        totalConnectors,
        engagedConnectors,
        faultedConnectors,
        unavailableConnectors,
        totalAmountSpent,
        totalEnergyConsumed: totalEnergyConsumed / 1000 || 0,
        inActiveChargers,
        preparingConnectors,
        finishingConnectors,
        todaySessions,
        todayRevenue,
        todayConsumption: todayConsumption / 1000 || 0,
      },
    };
  }

  async recentChargingSessions(vendorId: number) {
    const chargers = await this.repo.findChargerIdsByVendor(vendorId);
    if (chargers.length === 0) {
      throw new NotFoundException({ success: false, message: 'No chargers found for the vendor.' });
    }

    const transactions = await this.repo.findRecentTransactions(chargers.map((c) => c.id), 6);
    return { success: true, message: 'Device transactions fetched successfully', data: transactions };
  }

  async faultedChargeList(vendorId: number) {
    const faultedConnectors = await this.repo.findFaultedConnectorsByVendor(vendorId);
    return { success: true, message: 'Faulted chargers fetched successfully', data: faultedConnectors };
  }
}
