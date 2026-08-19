import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AwsModule } from '@integrations/aws';

import { Staff } from './entities/staff.entity';
import { ClientDetails } from './entities/client-details.entity';
import { ClientAmc } from '../../billing/src/entities/client-amc.entity';
import { ClientFeature } from './entities/client-feature.entity';
import { ClientFeatureMapping } from './entities/client-feature-mapping.entity';
import { CredentialConfig } from './entities/credential-config.entity';
import { PrefixConfig } from './entities/prefix-config.entity';
import { AuditLog } from './entities/audit-log.entity';
import { LoginTrack } from './entities/login-track.entity';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';
import { RolePermission } from './entities/role-permission.entity';
import { StaffRole } from './entities/staff-role.entity';
import { IndividualPermission } from './entities/individual-permission.entity';

import { ClientRepository } from './repositories/client.repository';
import { AdminPermissionRepository } from './repositories/admin-permission.repository';
import { AdminRoleRepository } from './repositories/admin-role.repository';
import { AdminLoginTrackRepository } from './repositories/admin-login-track.repository';
import { AdminStaffRepository } from './repositories/admin-staff.repository';
import { SuperAdminClientsService } from './services/super-admin-clients.service';
import { AdminClientsService } from './services/admin-clients.service';
import { AdminPermissionService } from './services/admin-permission.service';
import { AdminRoleService } from './services/admin-role.service';
import { AdminLoginTrackService } from './services/admin-login-track.service';
import { AdminStaffService } from './services/admin-staff.service';
import { SuperAdminClientsController } from './controllers/super-admin-clients.controller';
import { AdminClientsController } from './controllers/admin-clients.controller';
import { AdminPermissionController } from './controllers/admin-permission.controller';
import { AdminRoleController } from './controllers/admin-role.controller';
import { AdminLoginTrackController } from './controllers/admin-login-track.controller';
import { AdminStaffController } from './controllers/admin-staff.controller';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Staff,
      ClientDetails,
      ClientAmc,
      ClientFeature,
      ClientFeatureMapping,
      CredentialConfig,
      PrefixConfig,
      AuditLog,
      LoginTrack,
      Permission,
      Role,
      RolePermission,
      StaffRole,
      IndividualPermission,
    ]),
    AwsModule,
  ],
  providers: [
    ClientRepository,
    AdminPermissionRepository,
    AdminRoleRepository,
    AdminLoginTrackRepository,
    AdminStaffRepository,
    SuperAdminClientsService,
    AdminClientsService,
    AdminPermissionService,
    AdminRoleService,
    AdminLoginTrackService,
    AdminStaffService,
  ],
  controllers: [
    SuperAdminClientsController,
    AdminClientsController,
    AdminPermissionController,
    AdminRoleController,
    AdminLoginTrackController,
    AdminStaffController,
  ],
  exports: [
    TypeOrmModule,
    ClientRepository,
    AdminPermissionRepository,
    AdminRoleRepository,
    AdminLoginTrackRepository,
    AdminStaffRepository,
    SuperAdminClientsService,
    AdminClientsService,
    AdminPermissionService,
    AdminRoleService,
    AdminLoginTrackService,
    AdminStaffService,
  ],
})
export class ClientsModule {}
