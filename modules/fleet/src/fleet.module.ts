import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AwsModule } from '@integrations/aws';

import { FleetUser } from './entities/fleet-user.entity';
import { FleetUserDetail } from './entities/fleet-user-detail.entity';
import { FleetDriverVehicle } from './entities/fleet-driver-vehicle.entity';
import { FleetVehicleGroup } from './entities/fleet-vehicle-group.entity';
import { RfidTag } from './entities/rfid-tag.entity';
import { Wallet } from '../../wallet/src/entities/wallet.entity';
import { WalletTransaction } from '../../wallet/src/entities/wallet-transaction.entity';
import { PrefixConfig } from '../../clients/src/entities/prefix-config.entity';
import { ClientDetails } from '../../clients/src/entities/client-details.entity';
import { Vehicle } from '../../users/src/entities/vehicle.entity';
import { DeviceTransaction } from '../../sessions/src/entities/device-transaction.entity';
import { Feature } from '../../vendors/src/entities/feature.entity';
import { FeaturePermission } from '../../vendors/src/entities/feature-permission.entity';
import { VendorUser } from '../../vendors/src/entities/vendor-user.entity';
import { UserType } from '../../vendors/src/entities/user-type.entity';
import { Tariff } from '../../tariffs/src/entities/tariff.entity';
import { Charger } from '../../chargers/src/entities/charger.entity';
import { Station } from '../../stations/src/entities/station.entity';
import { VehicleModel } from '../../users/src/entities/vehicle-model.entity';
import { Brand } from '../../users/src/entities/brand.entity';
import { VehicleCapacity } from '../../users/src/entities/vehicle-capacity.entity';
import { SuperAdmin } from '../../super-admin/src/entities/super-admin.entity';
import { AuditLog } from '../../clients/src/entities/audit-log.entity';
import { Connector } from '../../chargers/src/entities/connector.entity';
import { Vendor } from '../../vendors/src/entities/vendor.entity';

import { FleetRepository } from './repositories/fleet.repository';
import { AdminRfidTagRepository } from './repositories/admin-rfid-tag.repository';
import { AdminFleetUserRepository } from './repositories/admin-fleet-user.repository';
import { AdminDriverRepository } from './repositories/admin-driver.repository';
import { AdminFleetVehicleGroupRepository } from './repositories/admin-fleet-vehicle-group.repository';
import { AdminFleetVehicleRepository } from './repositories/admin-fleet-vehicle.repository';
import { AdminFleetRfidRepository } from './repositories/admin-fleet-rfid.repository';
import { AdminFleetAnalyticsRepository } from './repositories/admin-fleet-analytics.repository';

import { FleetService } from './services/fleet.service';
import { AdminRfidTagService } from './services/admin-rfid-tag.service';
import { AdminFleetUserService } from './services/admin-fleet-user.service';
import { AdminDriverService } from './services/admin-driver.service';
import { AdminFleetVehicleGroupService } from './services/admin-fleet-vehicle-group.service';
import { AdminFleetVehicleService } from './services/admin-fleet-vehicle.service';
import { AdminFleetRfidService } from './services/admin-fleet-rfid.service';
import { AdminFleetTariffService } from './services/admin-fleet-tariff.service';
import { AdminFleetAnalyticsService } from './services/admin-fleet-analytics.service';

import { AdminRfidTagController } from './controllers/admin-rfid-tag.controller';
import { AdminFleetUserController } from './controllers/admin-fleet-user.controller';
import { AdminDriverController } from './controllers/admin-driver.controller';
import { AdminFleetVehicleGroupController } from './controllers/admin-fleet-vehicle-group.controller';
import { AdminFleetVehicleController } from './controllers/admin-fleet-vehicle.controller';
import { AdminFleetRfidController } from './controllers/admin-fleet-rfid.controller';
import { AdminFleetTariffController } from './controllers/admin-fleet-tariff.controller';
import { AdminFleetDeviceTransactionController } from './controllers/admin-fleet-device-transaction.controller';
import { AdminFleetAnalyticsController } from './controllers/admin-fleet-analytics.controller';
import { VendorRfidTagRepository } from './repositories/vendor-rfid-tag.repository';
import { VendorRfidTagService } from './services/vendor-rfid-tag.service';
import { VendorRfidTagController } from './controllers/vendor-rfid-tag.controller';
import { VendorFleetUserService } from './services/vendor-fleet-user.service';
import { VendorFleetUserController } from './controllers/vendor-fleet-user.controller';
import { VendorFleetVehicleGroupService } from './services/vendor-fleet-vehicle-group.service';
import { VendorFleetVehicleGroupController } from './controllers/vendor-fleet-vehicle-group.controller';
import { VendorFleetOverviewService } from './services/vendor-fleet-overview.service';
import { VendorFleetOverviewController } from './controllers/vendor-fleet-overview.controller';
import { VendorDriverService } from './services/vendor-driver.service';
import { VendorDriverController } from './controllers/vendor-driver.controller';
import { VendorFleetDeviceTransactionService } from './services/vendor-fleet-device-transaction.service';
import { VendorFleetDeviceTransactionController } from './controllers/vendor-fleet-device-transaction.controller';
import { VendorFleetTariffRepository } from './repositories/vendor-fleet-tariff.repository';
import { VendorFleetTariffService } from './services/vendor-fleet-tariff.service';
import { VendorFleetTariffController } from './controllers/vendor-fleet-tariff.controller';
import { VendorFleetRfidTagService } from './services/vendor-fleet-rfid-tag.service';
import { VendorFleetRfidTagController } from './controllers/vendor-fleet-rfid-tag.controller';
import { VendorFleetVehicleService } from './services/vendor-fleet-vehicle.service';
import { VendorFleetVehicleController } from './controllers/vendor-fleet-vehicle.controller';

import { EmployeeRepository } from '../../super-admin/src/repositories/employee.repository';
import { AuditLogRepository } from '../../super-admin/src/repositories/audit-log.repository';
import { SuperAdminFleetUserService } from './services/super-admin-fleet-user.service';
import { SuperAdminFleetUserController } from './controllers/super-admin-fleet-user.controller';
import { SuperAdminFleetRfidService } from './services/super-admin-fleet-rfid.service';
import { SuperAdminFleetRfidController } from './controllers/super-admin-fleet-rfid.controller';
import { SuperAdminFleetTariffService } from './services/super-admin-fleet-tariff.service';
import { SuperAdminFleetTariffController } from './controllers/super-admin-fleet-tariff.controller';
import { SuperAdminFleetVehicleGroupService } from './services/super-admin-fleet-vehicle-group.service';
import { SuperAdminFleetVehicleGroupController } from './controllers/super-admin-fleet-vehicle-group.controller';
import { SuperAdminFleetVehicleService } from './services/super-admin-fleet-vehicle.service';
import { SuperAdminFleetVehicleController } from './controllers/super-admin-fleet-vehicle.controller';
import { SuperAdminFleetDeviceTransactionService } from './services/super-admin-fleet-device-transaction.service';
import { SuperAdminFleetDeviceTransactionController } from './controllers/super-admin-fleet-device-transaction.controller';

import { FleetVehicleGroupService } from './services/fleet-vehicle-group.service';
import { FleetVehicleGroupController } from './controllers/fleet-vehicle-group.controller';
import { FleetRfidService } from './services/fleet-rfid.service';
import { FleetRfidController } from './controllers/fleet-rfid.controller';
import { FleetTariffService } from './services/fleet-tariff.service';
import { FleetTariffController } from './controllers/fleet-tariff.controller';
import { FleetWalletTransactionService } from './services/fleet-wallet-transaction.service';
import { FleetWalletTransactionController } from './controllers/fleet-wallet-transaction.controller';
import { FleetDashboardRepository } from './repositories/fleet-dashboard.repository';
import { FleetDashboardService } from './services/fleet-dashboard.service';
import { FleetDashboardController } from './controllers/fleet-dashboard.controller';
import { FleetVehicleService } from './services/fleet-vehicle.service';
import { FleetVehicleController } from './controllers/fleet-vehicle.controller';
import { FleetDriverService } from './services/fleet-driver.service';
import { FleetDriverController } from './controllers/fleet-driver.controller';
import { FleetDeviceTransactionRepository } from './repositories/fleet-device-transaction.repository';
import { FleetDeviceTransactionService } from './services/fleet-device-transaction.service';
import { FleetDeviceTransactionController } from './controllers/fleet-device-transaction.controller';
import { FleetInvoiceService } from './services/fleet-invoice.service';
import { FleetAssignedDriverRepository } from './repositories/fleet-assigned-driver.repository';
import { FleetAssignedDriverService } from './services/fleet-assigned-driver.service';
import { FleetAssignedDriverController } from './controllers/fleet-assigned-driver.controller';
import { FleetPaymentService } from './services/fleet-payment.service';
import { FleetPaymentController } from './controllers/fleet-payment.controller';
import { FleetAnalyticsRepository } from './repositories/fleet-analytics.repository';
import { FleetAnalyticsService } from './services/fleet-analytics.service';
import { FleetAnalyticsController, FleetOverviewController } from './controllers/fleet-analytics.controller';
import { FleetChargerRepository } from './repositories/fleet-charger.repository';
import { FleetChargerService } from './services/fleet-charger.service';
import { DriverDeviceTransactionRepository } from './repositories/driver-device-transaction.repository';
import { DriverDeviceTransactionService } from './services/driver-device-transaction.service';
import { DriverDeviceTransactionController } from './controllers/driver-device-transaction.controller';

import { TariffsModule } from '../../tariffs/src/tariffs.module';
import { SessionsModule } from '../../sessions/src/sessions.module';
import { WalletModule } from '../../wallet/src/wallet.module';
import { PaymentsModule } from '../../payments/src/payments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FleetUser,
      FleetUserDetail,
      FleetDriverVehicle,
      FleetVehicleGroup,
      RfidTag,
      Wallet,
      WalletTransaction,
      PrefixConfig,
      ClientDetails,
      Vehicle,
      DeviceTransaction,
      Feature,
      FeaturePermission,
      VendorUser,
      UserType,
      Tariff,
      Charger,
      Station,
      VehicleModel,
      Brand,
      VehicleCapacity,
      SuperAdmin,
      AuditLog,
      Connector,
      Vendor,
    ]),
    AwsModule,
    TariffsModule,
    SessionsModule,
    WalletModule,
    forwardRef(() => PaymentsModule),
  ],
  controllers: [
    AdminRfidTagController,
    AdminFleetUserController,
    AdminDriverController,
    AdminFleetVehicleGroupController,
    AdminFleetVehicleController,
    AdminFleetRfidController,
    AdminFleetTariffController,
    AdminFleetDeviceTransactionController,
    AdminFleetAnalyticsController,
    VendorRfidTagController,
    VendorFleetUserController,
    VendorFleetVehicleGroupController,
    VendorFleetOverviewController,
    VendorDriverController,
    VendorFleetDeviceTransactionController,
    VendorFleetTariffController,
    VendorFleetRfidTagController,
    VendorFleetVehicleController,
    SuperAdminFleetUserController,
    SuperAdminFleetRfidController,
    SuperAdminFleetTariffController,
    SuperAdminFleetVehicleGroupController,
    SuperAdminFleetVehicleController,
    SuperAdminFleetDeviceTransactionController,
    FleetVehicleGroupController,
    FleetRfidController,
    FleetTariffController,
    FleetWalletTransactionController,
    FleetDashboardController,
    FleetVehicleController,
    FleetDriverController,
    FleetDeviceTransactionController,
    FleetAssignedDriverController,
    FleetPaymentController,
    FleetAnalyticsController,
    FleetOverviewController,
    DriverDeviceTransactionController,
  ],
  providers: [
    FleetChargerRepository,
    FleetChargerService,
    DriverDeviceTransactionRepository,
    DriverDeviceTransactionService,
    FleetRepository,
    AdminRfidTagRepository,
    AdminFleetUserRepository,
    AdminDriverRepository,
    AdminFleetVehicleGroupRepository,
    AdminFleetVehicleRepository,
    AdminFleetRfidRepository,
    AdminFleetAnalyticsRepository,
    FleetService,
    AdminRfidTagService,
    AdminFleetUserService,
    AdminDriverService,
    AdminFleetVehicleGroupService,
    AdminFleetVehicleService,
    AdminFleetRfidService,
    AdminFleetTariffService,
    AdminFleetAnalyticsService,
    VendorRfidTagRepository,
    VendorRfidTagService,
    VendorFleetUserService,
    VendorFleetVehicleGroupService,
    VendorFleetOverviewService,
    VendorDriverService,
    VendorFleetDeviceTransactionService,
    VendorFleetTariffRepository,
    VendorFleetTariffService,
    VendorFleetRfidTagService,
    VendorFleetVehicleService,
    EmployeeRepository,
    AuditLogRepository,
    SuperAdminFleetUserService,
    SuperAdminFleetRfidService,
    SuperAdminFleetTariffService,
    SuperAdminFleetVehicleGroupService,
    SuperAdminFleetVehicleService,
    SuperAdminFleetDeviceTransactionService,
    FleetVehicleGroupService,
    FleetRfidService,
    FleetTariffService,
    FleetWalletTransactionService,
    FleetDashboardRepository,
    FleetDashboardService,
    FleetVehicleService,
    FleetDriverService,
    FleetDeviceTransactionRepository,
    FleetDeviceTransactionService,
    FleetInvoiceService,
    FleetAssignedDriverRepository,
    FleetAssignedDriverService,
    FleetPaymentService,
    FleetAnalyticsRepository,
    FleetAnalyticsService,
  ],
  exports: [TypeOrmModule, FleetRepository, AdminRfidTagRepository, FleetService, AdminRfidTagService, FleetChargerService],
})
export class FleetModule {}
