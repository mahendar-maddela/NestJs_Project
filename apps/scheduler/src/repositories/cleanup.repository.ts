import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Logs } from 'modules/chargers/src/entities/logs.entity';
import { OcpiLog } from 'modules/ocpi/src/entities/ocpi-log.entity';
import { RefreshToken } from 'modules/auth/src/entities/refresh-token.entity';
import { Notification } from 'modules/notifications/src/entities/notification.entity';

@Injectable()
export class CleanupRepository {
  constructor(
    @InjectRepository(Logs) private readonly logsRepo: Repository<Logs>,
    @InjectRepository(OcpiLog) private readonly ocpiLogRepo: Repository<OcpiLog>,
    @InjectRepository(RefreshToken) private readonly refreshTokenRepo: Repository<RefreshToken>,
    @InjectRepository(Notification) private readonly notificationRepo: Repository<Notification>,
  ) {}

  /** Mirrors `utils/logsDeleteAndBackUp.js:deleteLogs`. */
  async deleteOldLogs(): Promise<void> {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - 10);
    await this.logsRepo.delete({ createdAt: LessThan(dateThreshold) });

    // Faithfully replicates a legacy date-math quirk rather than the evident 40-day intent: legacy
    // builds `dateOcpiThreshold` as a *fresh* `new Date()` (today's month/year), then calls
    // `.setDate(dateThreshold.getDate() - 40)` — reusing `dateThreshold`'s day-of-month (already
    // itself `today - 10 days`) as the base for a further "-40", but applied against *today's*
    // month/year rather than continuing to subtract from `dateThreshold`. Net effect: the actual
    // OcpiLog cutoff is NOT a clean 40 days ago — it lands anywhere from ~19 to ~50 days ago
    // depending on today's day-of-month. See docs/legacy-parity-report.md for the derivation.
    const dateOcpiThreshold = new Date();
    dateOcpiThreshold.setDate(dateThreshold.getDate() - 40);
    await this.ocpiLogRepo.delete({ createdAt: LessThan(dateOcpiThreshold) });
  }

  /** Mirrors `utils/logsDeleteAndBackUp.js:deleteRefreshAndExpiredData`. Legacy's OTP cleanup in
   *  that function references an undefined `OTP` variable and throws a ReferenceError on every
   *  run, silently swallowed by the catch block — it has never actually executed in production.
   *  Only the RefreshToken cleanup that precedes it (and completes before the throw) is real. */
  async deleteExpiredRefreshTokens(): Promise<void> {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - 5);
    await this.refreshTokenRepo.delete({ expire: LessThan(dateThreshold) });
  }

  /** Mirrors `utils/cronJob.js`'s inline `deleteOldNotifications` job body. */
  async deleteOldNotifications(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cutoffDate = new Date(today);
    cutoffDate.setDate(cutoffDate.getDate() - 10);

    const result = await this.notificationRepo.delete({ createdAt: LessThan(cutoffDate) });
    return result.affected || 0;
  }
}
