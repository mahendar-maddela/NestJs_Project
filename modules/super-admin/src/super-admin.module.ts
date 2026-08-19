import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AwsModule } from '@integrations/aws';

import { SuperAdmin } from './entities/super-admin.entity';
import { SuperDepartment } from './entities/super-department.entity';
import { SuperRole } from './entities/super-role.entity';
import { SuperPermission } from './entities/super-permission.entity';
import { SuperRolePermission } from './entities/super-role-permission.entity';
import { AuditLog } from '../../clients/src/entities/audit-log.entity';
import { Staff } from '../../clients/src/entities/staff.entity';
import { ClientDetails } from '../../clients/src/entities/client-details.entity';
import { Vendor } from '../../vendors/src/entities/vendor.entity';
import { Feature } from '../../vendors/src/entities/feature.entity';
import { FeaturePermission } from '../../vendors/src/entities/feature-permission.entity';
import { Charger } from '../../chargers/src/entities/charger.entity';
import { Logs } from '../../chargers/src/entities/logs.entity';
import { ChargingSession } from '../../sessions/src/entities/charging-session.entity';
import { CpoAmc } from '../../billing/src/entities/cpo-amc.entity';
import { User } from '../../users/src/entities/user.entity';
import { Wallet } from '../../wallet/src/entities/wallet.entity';
import { PaymentTransaction } from '../../payments/src/entities/payment-transaction.entity';
import { WalletTransaction } from '../../wallet/src/entities/wallet-transaction.entity';
import { DeviceTransaction } from '../../sessions/src/entities/device-transaction.entity';
import { RfidTag } from '../../fleet/src/entities/rfid-tag.entity';
import { VendorUser } from '../../vendors/src/entities/vendor-user.entity';
import { Vehicle } from '../../users/src/entities/vehicle.entity';

import { EmployeeRepository } from './repositories/employee.repository';
import { DepartmentRepository } from './repositories/department.repository';
import { RoleRepository } from './repositories/role.repository';
import { AuditLogRepository } from './repositories/audit-log.repository';
import { SuperAdminVendorRepository } from '../../vendors/src/repositories/super-admin-vendor.repository';
import { SuperAdminUserRepository } from '../../users/src/repositories/super-admin-user.repository';
import { EmployeeService } from './services/employee.service';
import { DepartmentService } from './services/department.service';
import { RoleService } from './services/role.service';
import { AuditLogService } from './services/audit-log.service';
import { SuperAdminTariffService } from './services/super-admin-tariff.service';
import { SuperAdminVendorService } from '../../vendors/src/services/super-admin-vendor.service';
import { SuperAdminChargerService } from '../../chargers/src/services/super-admin-charger.service';
import { SuperAdminUserService } from '../../users/src/services/super-admin-user.service';
import { SuperAdminEmployeeController } from './controllers/super-admin-employee.controller';
import { SuperAdminDepartmentController } from './controllers/super-admin-department.controller';
import { SuperAdminRoleController } from './controllers/super-admin-role.controller';
import { AuditLogController } from './controllers/audit-log.controller';
import { SuperAdminTariffController } from './controllers/super-admin-tariff.controller';
import { SuperAdminVendorController } from '../../vendors/src/controllers/super-admin-vendor.controller';
import { SuperAdminChargerController } from '../../chargers/src/controllers/super-admin-charger.controller';
import { SuperAdminUserController } from '../../users/src/controllers/super-admin-user.controller';
import { TariffsModule } from '../../tariffs/src/tariffs.module';
import { SessionsModule } from '../../sessions/src/sessions.module';
import { ChargersModule } from '../../chargers/src/chargers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SuperAdmin,
      SuperDepartment,
      SuperRole,
      SuperPermission,
      SuperRolePermission,
      AuditLog,
      Staff,
      ClientDetails,
      Vendor,
      Feature,
      FeaturePermission,
      Charger,
      Logs,
      ChargingSession,
      CpoAmc,
      User,
      Wallet,
      PaymentTransaction,
      WalletTransaction,
      DeviceTransaction,
      RfidTag,
      VendorUser,
      Vehicle,
    ]),
    AwsModule,
    TariffsModule,
    SessionsModule,
    ChargersModule,
  ],
  controllers: [
    SuperAdminEmployeeController,
    SuperAdminDepartmentController,
    SuperAdminRoleController,
    AuditLogController,
    SuperAdminTariffController,
    SuperAdminVendorController,
  
    SuperAdminChargerController,
    SuperAdminUserController,
  ],
  providers: [
    EmployeeRepository,
    DepartmentRepository,
    RoleRepository,
    AuditLogRepository,
    SuperAdminVendorRepository,
    SuperAdminUserRepository,

    EmployeeService,
    DepartmentService,
    RoleService,
    AuditLogService,
    SuperAdminTariffService,
    SuperAdminVendorService,

    SuperAdminChargerService,
    SuperAdminUserService,
  ],
  exports: [
    TypeOrmModule,
    EmployeeRepository,
    DepartmentRepository,
    RoleRepository,
    EmployeeService,
    DepartmentService,
    RoleService,
  ],
})
export class SuperAdminModule {}
