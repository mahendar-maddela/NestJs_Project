import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AwsModule } from '@integrations/aws';

import { Vendor } from './entities/vendor.entity';
import { VendorUser } from './entities/vendor-user.entity';
import { VendorBankDetails } from './entities/vendor-bank-details.entity';
import { VendorPlatform } from './entities/vendor-platform.entity';
import { VendorRole } from './entities/vendor-role.entity';
import { VendorType } from './entities/vendor-type.entity';
import { VendorTypeAmenity } from './entities/vendor-type-amenity.entity';
import { Address } from './entities/address.entity';
import { Feature } from './entities/feature.entity';
import { FeaturePermission } from './entities/feature-permission.entity';
import { Platform } from './entities/platform.entity';
import { UserType } from './entities/user-type.entity';
import { ClientFeature } from '../../clients/src/entities/client-feature.entity';
import { ClientFeatureMapping } from '../../clients/src/entities/client-feature-mapping.entity';
import { Amenity } from '../../stations/src/entities/amenity.entity';
import { Station } from '../../stations/src/entities/station.entity';
import { Charger } from '../../chargers/src/entities/charger.entity';
import { Connector } from '../../chargers/src/entities/connector.entity';
import { DeviceTransaction } from '../../sessions/src/entities/device-transaction.entity';
import { RfidTag } from '../../fleet/src/entities/rfid-tag.entity';
import { User } from '../../users/src/entities/user.entity';
import { Credit } from '../../wallet/src/entities/credit.entity';
import { WalletTransaction } from '../../wallet/src/entities/wallet-transaction.entity';

import { VendorRepository } from './repositories/vendor.repository';
import { AdminVendorRepository } from './repositories/admin-vendor.repository';
import { AdminFeatureRepository } from './repositories/admin-feature.repository';
import { AdminVendorTypeRepository } from './repositories/admin-vendor-type.repository';
import { VendorEmployeeRepository } from './repositories/vendor-employee.repository';
import { VendorRoleRepository } from './repositories/vendor-role.repository';
import { VendorDashboardRepository } from './repositories/vendor-dashboard.repository';
import { VendorUserRepository } from './repositories/vendor-user.repository';
import { SuperAdminVendorRepository } from './repositories/super-admin-vendor.repository';
import { VendorService } from './services/vendor.service';
import { AdminVendorService } from './services/admin-vendor.service';
import { AdminFeatureService } from './services/admin-feature.service';
import { AdminVendorTypeService } from './services/admin-vendor-type.service';
import { VendorEmployeeService } from './services/vendor-employee.service';
import { VendorRoleService } from './services/vendor-role.service';
import { VendorDashboardService } from './services/vendor-dashboard.service';
import { VendorUserService } from './services/vendor-user.service';
import { AdminVendorController } from './controllers/admin-vendor.controller';
import { AdminFeatureController } from './controllers/admin-feature.controller';
import { AdminVendorTypeController } from './controllers/admin-vendor-type.controller';
import { VendorPermissionController } from './controllers/vendor-permission.controller';
import { VendorUserTypeController } from './controllers/vendor-user-type.controller';
import { VendorAmenityController } from './controllers/vendor-amenity.controller';
import { VendorEmployeeController } from './controllers/vendor-employee.controller';
import { VendorRoleController } from './controllers/vendor-role.controller';
import { VendorDashboardController } from './controllers/vendor-dashboard.controller';
import { VendorUserController } from './controllers/vendor-user.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Vendor,
      VendorUser,
      VendorBankDetails,
      VendorPlatform,
      VendorRole,
      VendorType,
      VendorTypeAmenity,
      Address,
      Feature,
      FeaturePermission,
      Platform,
      UserType,
      ClientFeature,
      ClientFeatureMapping,
      Amenity,
      Station,
      Charger,
      Connector,
      DeviceTransaction,
      RfidTag,
      User,
      Credit,
      WalletTransaction,
    ]),
    AwsModule,
  ],
  providers: [
    VendorRepository,
    AdminVendorRepository,
    AdminFeatureRepository,
    AdminVendorTypeRepository,
    VendorEmployeeRepository,
    VendorRoleRepository,
    VendorDashboardRepository,
    VendorUserRepository,
    SuperAdminVendorRepository,
    VendorService,
    AdminVendorService,
    AdminFeatureService,
    AdminVendorTypeService,
    VendorEmployeeService,
    VendorRoleService,
    VendorDashboardService,
    VendorUserService,
  ],
  controllers: [
    AdminVendorController,
    AdminFeatureController,
    AdminVendorTypeController,
    VendorPermissionController,
    VendorUserTypeController,
    VendorAmenityController,
    VendorEmployeeController,
    VendorRoleController,
    VendorDashboardController,
    VendorUserController,
  ],
  exports: [
    TypeOrmModule,
    VendorRepository,
    AdminVendorRepository,
    AdminFeatureRepository,
    AdminVendorTypeRepository,
    SuperAdminVendorRepository,
    VendorService,
    AdminVendorService,
    AdminFeatureService,
    AdminVendorTypeService,
  ],
})
export class VendorsModule {}
