import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { ClientTokenGuard } from '@modules/auth/src/guards/client-token.guard';

import { DatabaseModule } from 'database/src';
import { RedisModule } from '@app/redis';
import { TenancyModule } from '@app/tenancy';
import { SecurityModule } from '@app/security';
import { PdfModule } from '@integrations/pdf';
import { RealtimeModule } from '@app/realtime';

import { AuthModule } from '@modules/auth/src/auth.module';
import { UsersModule } from '@modules/users/src/users.module';
import { ClientsModule } from '@modules/clients/src/clients.module';
import { VendorsModule } from '@modules/vendors/src/vendors.module';
import { ChargersModule } from '@modules/chargers/src/chargers.module';
import { SessionsModule } from '@modules/sessions/src/sessions.module';
import { PaymentsModule } from '@modules/payments/src/payments.module';
import { FleetModule } from '@modules/fleet/src/fleet.module';
import { TariffsModule } from '@modules/tariffs/src/tariffs.module';
import { WalletModule } from '@modules/wallet/src/wallet.module';
import { OcpiModule } from '@modules/ocpi/src/ocpi.module';
import { ReportsModule } from '@modules/reports/src/reports.module';
import { NotificationsModule } from '@modules/notifications/src/notifications.module';
import { SuperAdminModule } from '@modules/super-admin/src/super-admin.module';
import { StationsModule } from '@modules/stations/src/stations.module';
import { SupportModule } from '@modules/support/src/support.module';
import { BillingModule } from '@modules/billing/src/billing.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
            : undefined,
        level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
        autoLogging: {
          ignore: (req) => req.url === '/' || req.url === '/health',
        },
        // Every request is still logged (required — see CLAUDE.md), but only the
        // essentials print to the console instead of the full req/res objects
        // (headers, query, remoteAddress, etc.), which drowned out everything else.
        serializers: {
          req: (req) => ({ method: req.method, url: req.url }),
          res: (res) => ({ statusCode: res.statusCode }),
        },
      },
    }),
    DatabaseModule,
    RedisModule,
    TenancyModule,
    SecurityModule,
    PdfModule,
    RealtimeModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    VendorsModule,
    ChargersModule,
    SessionsModule,
    PaymentsModule,
    FleetModule,
    TariffsModule,
    WalletModule,
    OcpiModule,
    ReportsModule,
    NotificationsModule,
    SuperAdminModule,
    StationsModule,
    SupportModule,
    BillingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Mirrors server.js:159-164's clientUserAuthenticate mount — every admin/vendor/fleet/web/app
    // route requires a DB-verified x-client-token; super-admin, OCPI (their own token auth), and
    // the two public Razorpay webhooks are excluded (server.js:149-157), matched by URL inside the
    // guard itself since Nest has no built-in per-route exclusion for global guards.
    { provide: APP_GUARD, useClass: ClientTokenGuard },
  ],
})
export class AppModule {}
