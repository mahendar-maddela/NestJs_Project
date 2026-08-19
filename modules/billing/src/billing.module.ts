import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CpoAmc } from './entities/cpo-amc.entity';
import { CpoSettlement } from './entities/cpo-settlement.entity';
import { ClientAmc } from './entities/client-amc.entity';
import { ClientChargerAmc } from './entities/client-charger-amc.entity';
import { Vendor } from '../../vendors/src/entities/vendor.entity';
import { Charger } from '../../chargers/src/entities/charger.entity';
import { Station } from '../../stations/src/entities/station.entity';
import { Staff } from '../../clients/src/entities/staff.entity';
import { ClientDetails } from '../../clients/src/entities/client-details.entity';
import { StaffRole } from '../../clients/src/entities/staff-role.entity';
import { RolePermission } from '../../clients/src/entities/role-permission.entity';
import { ClientFeature } from '../../clients/src/entities/client-feature.entity';
import { ClientFeatureMapping } from '../../clients/src/entities/client-feature-mapping.entity';
import { Feature } from '../../vendors/src/entities/feature.entity';
import { FeaturePermission } from '../../vendors/src/entities/feature-permission.entity';

import { AdminCpoAmcRepository } from './repositories/admin-cpo-amc.repository';
import { AdminCpoSettlementRepository } from './repositories/admin-cpo-settlement.repository';
import { AdminSoftwareAmcRepository } from './repositories/admin-software-amc.repository';
import { VendorCpoAmcRepository } from './repositories/vendor-cpo-amc.repository';
import { VendorCpoSettlementRepository } from './repositories/vendor-cpo-settlement.repository';
import { SuperAdminClientAmcRepository } from './repositories/super-admin-client-amc.repository';
import { SuperAdminChargerAmcRepository } from './repositories/super-admin-charger-amc.repository';

import { AdminCpoAmcService } from './services/admin-cpo-amc.service';
import { AdminCpoSettlementService } from './services/admin-cpo-settlement.service';
import { AdminSoftwareAmcService } from './services/admin-software-amc.service';
import { VendorCpoAmcService } from './services/vendor-cpo-amc.service';
import { VendorCpoSettlementService } from './services/vendor-cpo-settlement.service';
import { SuperAdminClientAmcService } from './services/super-admin-client-amc.service';
import { SuperAdminChargerAmcService } from './services/super-admin-charger-amc.service';

import { AdminCpoAmcController } from './controllers/admin-cpo-amc.controller';
import { AdminCpoSettlementController } from './controllers/admin-cpo-settlement.controller';
import { AdminSoftwareAmcController } from './controllers/admin-software-amc.controller';
import { VendorCpoAmcController } from './controllers/vendor-cpo-amc.controller';
import { VendorCpoSettlementController } from './controllers/vendor-cpo-settlement.controller';
import { SuperAdminClientAmcController } from './controllers/super-admin-client-amc.controller';
import { SuperAdminChargerAmcController } from './controllers/super-admin-charger-amc.controller';

/** Consolidates all AMC (ClientAmc, ClientChargerAmc, CpoAmc) and Settlement (CpoSettlement) code for every actor. */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      CpoAmc,
      CpoSettlement,
      ClientAmc,
      ClientChargerAmc,
      Vendor,
      Charger,
      Station,
      Staff,
      ClientDetails,
      StaffRole,
      RolePermission,
      ClientFeature,
      ClientFeatureMapping,
      Feature,
      FeaturePermission,
    ]),
  ],
  providers: [
    AdminCpoAmcRepository,
    AdminCpoSettlementRepository,
    AdminSoftwareAmcRepository,
    VendorCpoAmcRepository,
    VendorCpoSettlementRepository,
    SuperAdminClientAmcRepository,
    SuperAdminChargerAmcRepository,
    AdminCpoAmcService,
    AdminCpoSettlementService,
    AdminSoftwareAmcService,
    VendorCpoAmcService,
    VendorCpoSettlementService,
    SuperAdminClientAmcService,
    SuperAdminChargerAmcService,
  ],
  controllers: [
    AdminCpoAmcController,
    AdminCpoSettlementController,
    AdminSoftwareAmcController,
    VendorCpoAmcController,
    VendorCpoSettlementController,
    SuperAdminClientAmcController,
    SuperAdminChargerAmcController,
  ],
  exports: [TypeOrmModule, AdminCpoAmcRepository, AdminCpoSettlementRepository, AdminSoftwareAmcRepository],
})
export class BillingModule {}
