import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from 'database/src';
import { RedisModule } from '@app/redis';
import { TenancyModule } from '@app/tenancy';
import { ChargingSession } from 'modules/sessions/src/entities/charging-session.entity';
import { Charger } from 'modules/chargers/src/entities/charger.entity';
import { Logs } from 'modules/chargers/src/entities/logs.entity';
import { OcpiLog } from 'modules/ocpi/src/entities/ocpi-log.entity';
import { RefreshToken } from 'modules/auth/src/entities/refresh-token.entity';
import { Notification } from 'modules/notifications/src/entities/notification.entity';
import { CpoAmc } from 'modules/billing/src/entities/cpo-amc.entity';
import { ClientAmc } from 'modules/billing/src/entities/client-amc.entity';
import { ClientChargerAmc } from 'modules/billing/src/entities/client-charger-amc.entity';
import { ClientSupport } from 'modules/support/src/entities/client-support.entity';
import { Vendor } from 'modules/vendors/src/entities/vendor.entity';
import { DeviceTransaction } from 'modules/sessions/src/entities/device-transaction.entity';
import { CpoSettlement } from 'modules/billing/src/entities/cpo-settlement.entity';
import { OcpiCpo } from 'modules/ocpi/src/entities/ocpi-cpo.entity';
import { OcpiCpoVersion } from 'modules/ocpi/src/entities/ocpi-cpo-version.entity';
import { OcpiCpoVersionEndpoint } from 'modules/ocpi/src/entities/ocpi-cpo-version-endpoint.entity';
import { QrSweepService } from './queue/qr-sweep.service';
import { QrSweepRepository } from './queue/qr-sweep.repository';
import { CleanupCron } from './cron/cleanup.cron';
import { AmcExpiryCron } from './cron/amc-expiry.cron';
import { CpoSettlementCron } from './cron/cpo-settlement.cron';
import { OcpiHealthCron } from './cron/ocpi-health.cron';
import { CleanupRepository } from './repositories/cleanup.repository';
import { AmcExpiryRepository } from './repositories/amc-expiry.repository';
import { CpoSettlementRepository } from './repositories/cpo-settlement.repository';
import { OcpiHealthRepository } from './repositories/ocpi-health.repository';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    RedisModule,
    TenancyModule,
    TypeOrmModule.forFeature([
      ChargingSession,
      Charger,
      Logs,
      OcpiLog,
      RefreshToken,
      Notification,
      CpoAmc,
      ClientAmc,
      ClientChargerAmc,
      ClientSupport,
      Vendor,
      DeviceTransaction,
      CpoSettlement,
      OcpiCpo,
      OcpiCpoVersion,
      OcpiCpoVersionEndpoint,
    ]),
  ],
  providers: [
    QrSweepService,
    QrSweepRepository,
    CleanupCron,
    AmcExpiryCron,
    CpoSettlementCron,
    OcpiHealthCron,
    CleanupRepository,
    AmcExpiryRepository,
    CpoSettlementRepository,
    OcpiHealthRepository,
  ],
})
export class SchedulerModule {}
