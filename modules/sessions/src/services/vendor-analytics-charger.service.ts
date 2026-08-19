import { Injectable } from '@nestjs/common';
import { getTodayDateIstToUtc, getIstDateRangeInUtc } from '@app/common';
import { VendorAnalyticsChargerRepository } from '../repositories/vendor-analytics-charger.repository';

/** Mirrors `controllers/vendors/AnalyticsChargerController.js`. */
@Injectable()
export class VendorAnalyticsChargerService {
  constructor(private readonly repo: VendorAnalyticsChargerRepository) {}

  async totalPowerConsumption(chargerId: string, vendorId: number) {
    const total = await this.repo.sumTotalWh(chargerId, vendorId);
    return { success: true, message: 'Successfully fetched total Power consumption', data: total / 1000 || 0 };
  }

  async todayPowerConsumption(chargerId: string, vendorId: number) {
    const today = getTodayDateIstToUtc();
    const total = await this.repo.sumTotalWh(chargerId, vendorId, today);
    return { success: true, message: 'Successfully fetched total Power consumption', data: total / 1000 || 0 };
  }

  async getTotalTransactions(chargerId: string, vendorId: number) {
    const total = await this.repo.countTransactions(chargerId, vendorId);
    return { success: true, message: 'Successfully fetched the total transactions', data: total };
  }

  async todayTotalTransactions(chargerId: string, vendorId: number) {
    const today = getTodayDateIstToUtc();
    const total = await this.repo.countTransactions(chargerId, vendorId, today);
    return { success: true, message: 'Successfully fetched the total transactions', data: total };
  }

  async getEnergyConsumptionOfPastWeek(chargerId: string, vendorId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentDate = new Date(today);
    const dayWise: { date: string; consumption: number }[] = [];

    for (let i = 0; i < 7; i++) {
      const dayOffset = new Date();
      dayOffset.setDate(dayOffset.getDate() - i);
      const { startDate, endDate } = getIstDateRangeInUtc(dayOffset, dayOffset);
      const consumption = await this.repo.sumTotalWhBetween(chargerId, vendorId, startDate, endDate);
      dayWise.push({ date: currentDate.toISOString().slice(0, 10), consumption: consumption / 1000 || 0 });
      currentDate.setDate(currentDate.getDate() - 1);
    }

    return { success: true, message: 'Successfully fetched day wise transactions of consumption', data: dayWise };
  }

  async getChargingSessionsOfPastWeek(chargerId: string, vendorId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentDate = new Date(today);
    const dayWise: { date: string; transactions: number }[] = [];

    for (let i = 0; i < 7; i++) {
      const dayOffset = new Date();
      dayOffset.setDate(dayOffset.getDate() - i);
      const { startDate, endDate } = getIstDateRangeInUtc(dayOffset, dayOffset);
      const transactions = await this.repo.countTransactionsBetween(chargerId, vendorId, startDate, endDate);
      dayWise.push({ date: currentDate.toISOString().slice(0, 10), transactions: transactions || 0 });
      currentDate.setDate(currentDate.getDate() - 1);
    }

    return { success: true, message: 'Successfully fetched day wise transactions', data: dayWise };
  }

  async getChargerAnalytics(chargerId: string, vendorId: number) {
    const [maxTemperature, maxVoltage, minVoltage, maxCurrent, minCurrent] = await Promise.all([
      this.repo.maxField(chargerId, vendorId, 'temperature'),
      this.repo.maxField(chargerId, vendorId, 'voltage'),
      this.repo.minField(chargerId, vendorId, 'voltage'),
      this.repo.maxField(chargerId, vendorId, 'currentOffered'),
      this.repo.minField(chargerId, vendorId, 'currentOffered'),
    ]);

    return {
      success: true,
      message: 'Successfully fetched device analytics data',
      data: { maxTemperature, maxCurrent, minCurrent, minVoltage, maxVoltage },
    };
  }
}
