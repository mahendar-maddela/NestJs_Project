import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AdminDashboardRepository } from '../repositories/admin-dashboard.repository';
import { DashboardTotalsQueryDto } from '../dto/admin-dashboard.dto';
import { ChargerCommandService } from '../../../chargers/src/services/charger-command.service';

function resolveBeforeDate(period?: string): Date {
  const now = new Date();
  switch (period) {
    case 'week':
      return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    case 'twoWeeks':
      return new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    case 'month': {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      return d;
    }
    case 'quarter': {
      const d = new Date();
      d.setMonth(d.getMonth() - 3);
      return d;
    }
    default:
      return now;
  }
}

function calculateGrowthPercentage(total: number, initial: number | null | undefined): string {
  if (initial == null || initial === 0) {
    return (total > 0 ? 100 : 0).toFixed(2);
  }
  const growth = ((total - initial) / initial) * 100;
  return (growth === Infinity || isNaN(growth) ? 0 : growth).toFixed(2);
}

/** Mirrors `controllers/admin/dashboard.js`. */
@Injectable()
export class AdminDashboardService {
  constructor(
    private readonly repo: AdminDashboardRepository,
    private readonly chargerCommandService: ChargerCommandService,
  ) {}

  async getTotals(clientId: number, query: DashboardTotalsQueryDto) {
    const beforeDate = resolveBeforeDate(query.period);

    const totalVendors = await this.repo.countVendors(clientId);
    const initialVendors = await this.repo.countVendors(clientId, beforeDate);
    const vendorGrowthPercentage = calculateGrowthPercentage(totalVendors, initialVendors);

    const [totalCommunities, totalCb, totalScops] = await Promise.all([
      this.repo.countVendorsByType(clientId, 'Housing Societies'),
      this.repo.countVendorsByType(clientId, 'CommercialBuilding'),
      this.repo.countVendorsByType(clientId, 'SCPOs'),
    ]);

    const [initialCommunities, initialCb, initialScops] = await Promise.all([
      this.repo.countVendorsByTypeGlobal('GatedCommunity', beforeDate),
      this.repo.countVendorsByTypeGlobal('CommercialBuilding', beforeDate),
      this.repo.countVendorsByTypeGlobal('SCPOs', beforeDate),
    ]);

    const communitiesGrowthPercentage = calculateGrowthPercentage(totalCommunities, initialCommunities);
    const cbGrowthPercentage = calculateGrowthPercentage(totalCb, initialCb);
    const scopsGrowthPercentage = calculateGrowthPercentage(totalScops, initialScops);

    const totalUsers = await this.repo.countUsers(clientId);
    const initialUsers = await this.repo.countUsers(clientId, beforeDate);
    const userGrowthPercentage = calculateGrowthPercentage(totalUsers, initialUsers);

    const totalStations = await this.repo.countStations(clientId);
    const initialStations = await this.repo.countStations(clientId, beforeDate);
    const stationsGrowthPercentage = calculateGrowthPercentage(totalStations, initialStations);

    const totalCharges = await this.repo.countChargers(clientId);
    const [acChargerCount, dcChargerCount] = await Promise.all([
      this.repo.countChargers(clientId, 'AC'),
      this.repo.countChargers(clientId, 'DC'),
    ]);
    const [initialAcCount, initialDcCount] = await Promise.all([
      this.repo.countChargers(clientId, 'AC', beforeDate),
      this.repo.countChargers(clientId, 'DC', beforeDate),
    ]);
    const acChargerGrowthPercentage = calculateGrowthPercentage(acChargerCount, initialAcCount);
    const dcChargerGrowthPercentage = calculateGrowthPercentage(dcChargerCount, initialDcCount);

    const initialCharges = await this.repo.countChargers(clientId, undefined, beforeDate);
    const chargesGrowthPercentage = calculateGrowthPercentage(totalCharges, initialCharges);

    const [
      connectorAvailableCount,
      connectorUnavailableCount,
      connectorFaultedCount,
      connectorEngagedCount,
      connectorPreparingCount,
      connectorChargingCount,
      connectorFinishingCount,
      connectorSuspendedEVSECount,
      connectorSuspendedEVCount,
      connectorReservedCount,
    ] = await Promise.all([
      this.repo.countConnectorsByStatus(clientId, 'Available'),
      this.repo.countConnectorsByStatus(clientId, 'Unavailable'),
      this.repo.countConnectorsByStatus(clientId, 'Faulted'),
      this.repo.countConnectorsByStatus(clientId, 'Engaged'),
      this.repo.countConnectorsByStatus(clientId, 'Preparing'),
      this.repo.countConnectorsByStatus(clientId, 'Charging'),
      this.repo.countConnectorsByStatus(clientId, 'Finishing'),
      this.repo.countConnectorsByStatus(clientId, 'SuspendedEVSE'),
      this.repo.countConnectorsByStatus(clientId, 'SuspendedEV'),
      this.repo.countConnectorsByStatus(clientId, 'Reserved'),
    ]);

    const totalAmountSpent = await this.repo.sumDeviceTransactionField(clientId, 'price');
    const initialAmountSpent = await this.repo.sumDeviceTransactionField(clientId, 'price', beforeDate);
    const amountSpentGrowthPercentage = calculateGrowthPercentage(totalAmountSpent, initialAmountSpent);

    const totalEnergyConsumed = await this.repo.sumDeviceTransactionField(clientId, 'totalWh');
    const initialEnergyConsumed = await this.repo.sumDeviceTransactionField(clientId, 'totalWh', beforeDate);
    const energyConsumedGrowthPercentage = calculateGrowthPercentage(totalEnergyConsumed, initialEnergyConsumed);

    return {
      success: true,
      message: 'Total fetched successfully',
      data: {
        totalVendors,
        vendorGrowthPercentage,
        totalCommunities,
        totalCb,
        totalScops,
        communitiesGrowthPercentage,
        cbGrowthPercentage,
        scopsGrowthPercentage,
        totalUsers,
        userGrowthPercentage,
        totalStations,
        stationsGrowthPercentage,
        totalCharges,
        chargesGrowthPercentage,
        connectorAvailableCount,
        connectorUnavailableCount,
        connectorFaultedCount,
        connectorSuspendedEVSECount,
        connectorSuspendedEVCount,
        connectorChargingCount,
        connectorReservedCount,
        connectorEngagedCount,
        connectorPreparingCount,
        connectorFinishingCount,
        totalAmountSpent,
        acChargerCount,
        dcChargerCount,
        acChargerGrowthPercentage,
        dcChargerGrowthPercentage,
        amountSpentGrowthPercentage,
        totalEnergyConsumed: totalEnergyConsumed / 1000 || 0,
        energyConsumedGrowthPercentage,
      },
    };
  }

  async getFaulted(clientId: number) {
    const faultedConnectors = await this.repo.findFaultedConnectors(clientId);
    return { success: true, message: 'Faulted connectors fetched successfully', data: faultedConnectors };
  }

  async getNotStoppedSessions(clientId: number) {
    const sessions = await this.repo.findNotStoppedSessions(clientId);

    const shaped = sessions.map((s) => {
      const fleetManager = (s.fleetUser?.fleetUsers || [])
        .filter((fu) => fu.type === 'FLEET_MANAGER')
        .sort((a, b) => a.id - b.id)[0];

      return {
        ...s,
        fleetUser: s.fleetUser
          ? {
              id: s.fleetUser.id,
              cName: s.fleetUser.cName,
              fleetUId: s.fleetUser.fleetUId,
              fleetUsers: fleetManager ? [{ id: fleetManager.id, phone: fleetManager.phone }] : [],
            }
          : null,
      };
    });

    return { success: true, message: 'Not stopped sessions fetched successfully', data: shaped };
  }

  async getSingleNotStoppedSession(clientId: number, transactionId: number) {
    const notStopped = await this.repo.findNotStoppedSessionById(transactionId, clientId);
    if (!notStopped) {
      throw new NotFoundException({ success: false, message: 'Not stopped session not found' });
    }

    const nextTransaction = await this.repo.findNextTransaction(notStopped.chargerId, notStopped.connectorId, notStopped.id);

    const nextMeterValue =
      nextTransaction?.startMeterValue && nextTransaction.startMeterValue > 0
        ? nextTransaction.startMeterValue
        : notStopped.stopMeterValue;

    return {
      success: true,
      message: 'Not stopped session fetched successfully',
      data: { ...notStopped, nextMeterValue },
    };
  }

  async stopNotStoppedSession(clientId: number, transactionId: number, meterStop: number) {
    if (meterStop === undefined || meterStop === null) {
      throw new BadRequestException({ success: false, message: 'Stop Meter Value is required' });
    }
    if (isNaN(meterStop) || Number(meterStop) < 0) {
      throw new BadRequestException({ success: false, message: 'Invalid Stop Meter Value' });
    }

    const notStopped = await this.repo.findNotStoppedSessionForStop(transactionId, clientId);
    if (!notStopped) {
      throw new NotFoundException({ success: false, message: 'Not stopped session not found' });
    }

    if (notStopped.stopMeterValue && Number(meterStop) < Number(notStopped.stopMeterValue)) {
      throw new BadRequestException({ success: false, message: 'Meter value cannot be less than stop meter value' });
    }

    const result = await this.chargerCommandService.adminForceStopTransaction(
      Number(notStopped.transactionId),
      meterStop,
      'Other',
    );

    // Legacy always responds `success: true` here, using result.status (200 or 500) as the HTTP status.
    return { httpStatus: result.status, message: result.message, data: notStopped };
  }
}
