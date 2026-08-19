import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MonthlyAnalytics } from './entities/monthly-analytics.entity';
import { Vendor } from '../../vendors/src/entities/vendor.entity';
import { User } from '../../users/src/entities/user.entity';
import { Station } from '../../stations/src/entities/station.entity';
import { Charger } from '../../chargers/src/entities/charger.entity';
import { Connector } from '../../chargers/src/entities/connector.entity';
import { DeviceTransaction } from '../../sessions/src/entities/device-transaction.entity';
import { FleetUserDetail } from '../../fleet/src/entities/fleet-user-detail.entity';
import { FleetUser } from '../../fleet/src/entities/fleet-user.entity';

import { Feature } from '../../vendors/src/entities/feature.entity';
import { FeaturePermission } from '../../vendors/src/entities/feature-permission.entity';

import { ReportsRepository } from './repositories/reports.repository';
import { AdminDashboardRepository } from './repositories/admin-dashboard.repository';
import { AdminAnalyticsRevenueRepository } from './repositories/admin-analytics-revenue.repository';
import { VendorAnalyticsRevenueRepository } from './repositories/vendor-analytics-revenue.repository';
import { ReportsService } from './services/reports.service';
import { AdminDashboardService } from './services/admin-dashboard.service';
import { AdminAnalyticsRevenueService } from './services/admin-analytics-revenue.service';
import { VendorAnalyticsRevenueService } from './services/vendor-analytics-revenue.service';
import { SuperAdminAnalyticsRevenueService } from './services/super-admin-analytics-revenue.service';
import { AdminReportsController } from './controllers/admin-reports.controller';
import { AdminDashboardController } from './controllers/admin-dashboard.controller';
import { AdminAnalyticsRevenueController } from './controllers/admin-analytics-revenue.controller';
import { VendorAnalyticsRevenueController } from './controllers/vendor-analytics-revenue.controller';
import { SuperAdminAnalyticsRevenueController } from './controllers/super-admin-analytics-revenue.controller';
import { ChargersModule } from '../../chargers/src/chargers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MonthlyAnalytics,
      Vendor,
      User,
      Station,
      Charger,
      Connector,
      DeviceTransaction,
      FleetUserDetail,
      FleetUser,
      Feature,
      FeaturePermission,
    ]),
    ChargersModule,
  ],
  controllers: [
    AdminReportsController,
    AdminDashboardController,
    AdminAnalyticsRevenueController,
    VendorAnalyticsRevenueController,
    SuperAdminAnalyticsRevenueController,
  ],
  providers: [
    ReportsRepository,
    AdminDashboardRepository,
    AdminAnalyticsRevenueRepository,
    VendorAnalyticsRevenueRepository,
    ReportsService,
    AdminDashboardService,
    AdminAnalyticsRevenueService,
    VendorAnalyticsRevenueService,
    SuperAdminAnalyticsRevenueService,
  ],
  exports: [TypeOrmModule, ReportsRepository, ReportsService],
})
export class ReportsModule {}
