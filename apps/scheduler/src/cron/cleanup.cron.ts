import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CleanupRepository } from '../repositories/cleanup.repository';

/** Mirrors the daily cleanup jobs in legacy `utils/cronJob.js`. */
@Injectable()
export class CleanupCron {
  private readonly logger = new Logger(CleanupCron.name);

  constructor(private readonly repo: CleanupRepository) {}

  /** Mirrors `deleteTime` (daily 01:00) -> `logsDeleteAndBackUp.js:deleteLogs`. */
  @Cron('0 1 * * *')
  async handleDeleteLogs(): Promise<void> {
    this.logger.log('Cron job running every day at 1 AM to delete old logs');
    try {
      await this.repo.deleteOldLogs();
    } catch (error: any) {
      this.logger.error(`Error backing up and deleting old records: ${error.message}`);
    }
  }

  /** Mirrors `deleteExpiredData` (daily 23:00) -> `logsDeleteAndBackUp.js:deleteRefreshAndExpiredData`. */
  @Cron('0 23 * * *')
  async handleDeleteExpiredData(): Promise<void> {
    this.logger.log('Cron job running every day at 11 PM to delete old logs');
    try {
      await this.repo.deleteExpiredRefreshTokens();
    } catch (error: any) {
      this.logger.error(error.message);
    }
  }

  /** Mirrors `deleteOldNotifications` (daily 00:10). */
  @Cron('10 0 * * *')
  async handleDeleteOldNotifications(): Promise<void> {
    this.logger.log('Cron job running every day at 12:10 AM to delete old notifications');
    try {
      const deleted = await this.repo.deleteOldNotifications();
      this.logger.log(`✔ Strict deletion complete → ${deleted} notifications removed`);
    } catch (error: any) {
      this.logger.error(`❌ Error deleting old notifications: ${error.message}`);
    }
  }
}
