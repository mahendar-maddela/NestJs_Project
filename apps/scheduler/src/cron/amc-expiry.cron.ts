import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AmcExpiryRepository } from '../repositories/amc-expiry.repository';

/** Mirrors the AMC-expiry jobs in legacy `utils/cronJob.js`. */
@Injectable()
export class AmcExpiryCron {
  private readonly logger = new Logger(AmcExpiryCron.name);

  constructor(private readonly repo: AmcExpiryRepository) {}

  /** Mirrors `ExpiredAmcs` (daily 00:00) -> `cpoAmcController.js:markExpiredAmcs`. */
  @Cron('0 0 * * *')
  async handleMarkExpiredCpoAmcs(): Promise<void> {
    this.logger.log('Running AMC expiry check... every day at 12:00 AM');
    try {
      const count = await this.repo.markExpiredCpoAmcs();
      this.logger.log(count > 0 ? `${count} AMC(s) marked as expired.` : 'No AMCs to expire today.');
    } catch (error: any) {
      this.logger.error(`Error marking AMCs as expired: ${error.message}`);
    }
  }

  /** Mirrors `ExpiredCharegrAmc` (daily 00:00) -> `chargerClientAmcController.js:generateExpiredChargerAmc`. */
  @Cron('0 0 * * *')
  async handleMarkExpiredChargerAmcs(): Promise<void> {
    this.logger.log('Running Charger AMC expiry check... every day at 12:00 AM');
    try {
      await this.repo.markExpiredClientChargerAmcs();
    } catch (error: any) {
      this.logger.error(`Cron Error: ${error.message}`);
    }
  }

  /** Mirrors `ExpiredClientAmc` (daily 00:00) -> `clientAmcController.js:generateExpiredClientAmc`. */
  @Cron('0 0 * * *')
  async handleClientAmcExpiry(): Promise<void> {
    this.logger.log('Running Client AMC expiry check... every day at 12:00 AM');
    try {
      // Legacy compares `endDate < today` where `today` is a date-only ISO string
      // (`new Date().toISOString().split('T')[0]`), i.e. midnight UTC of today.
      const todayDateOnly = new Date(new Date().toISOString().split('T')[0]);
      const todayDate = new Date();

      const expiredCandidates = await this.repo.findExpiredClientAmcCandidates(todayDateOnly);
      for (const amc of expiredCandidates) {
        await this.repo.markClientAmcExpired(amc.id);
        this.logger.log(`Expired AMC updated for clientId: ${amc.clientId}`);
      }

      const activeAmcs = await this.repo.findActiveClientAmcs();
      for (const amc of activeAmcs) {
        if (!amc.startDate) continue;
        const startDay = new Date(amc.startDate).getDate();

        if (todayDate.getDate() !== startDay) continue;

        // Prevent duplicate run within the same monthly cycle.
        if (amc.last_cycle_processed_at) {
          const last = new Date(amc.last_cycle_processed_at);
          if (last.getMonth() === todayDate.getMonth() && last.getFullYear() === todayDate.getFullYear()) {
            continue;
          }
        }

        const cycleStart = new Date(todayDate);
        cycleStart.setHours(0, 0, 0, 0);
        cycleStart.setDate(startDay);

        const cycleEnd = new Date(cycleStart);
        cycleEnd.setMonth(cycleEnd.getMonth() + 1);
        if (cycleEnd.getDate() !== startDay) {
          cycleEnd.setDate(0);
        }

        const supports = await this.repo.findClosedSupportsInCycle(amc.clientId, cycleStart, cycleEnd);
        const usedHours = supports.reduce((sum, s) => sum + (s.deducted_amc_hours || 0), 0);
        const monthlyHours = (amc.standard_amc_hours || 0) / 12;

        if (usedHours < monthlyHours) {
          const toDeduct = monthlyHours - usedHours;
          const remaining = Math.max(0, (amc.remaining_amc_hours || 0) - toDeduct);
          await this.repo.updateClientAmcCycle(amc.id, { remaining_amc_hours: remaining, last_cycle_processed_at: new Date() });
        } else {
          await this.repo.updateClientAmcCycle(amc.id, { last_cycle_processed_at: new Date() });
        }
      }
    } catch (error: any) {
      this.logger.error(`Cron Error: ${error.message}`);
    }
  }
}
