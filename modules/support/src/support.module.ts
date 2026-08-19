import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AwsModule } from '@integrations/aws';

import { ClientSupport } from './entities/client-support.entity';
import { SupportTicketMessage } from './entities/support-ticket-message.entity';
import { ClientSupportAssignment } from './entities/client-support-assignment.entity';
import { ClientAmc } from '../../billing/src/entities/client-amc.entity';
import { Staff } from '../../clients/src/entities/staff.entity';
import { SuperAdmin } from '../../super-admin/src/entities/super-admin.entity';

import { SupportRepository } from './repositories/support.repository';
import { AdminSoftwareSupportRepository } from './repositories/admin-software-support.repository';
import { SuperAdminClientSupportRepository } from './repositories/super-admin-client-support.repository';
import { SupportService } from './services/support.service';
import { AdminSoftwareSupportService } from './services/admin-software-support.service';
import { SuperAdminClientSupportService } from './services/super-admin-client-support.service';
import { AdminSoftwareSupportController } from './controllers/admin-software-support.controller';
import { SuperAdminClientSupportController } from './controllers/super-admin-client-support.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClientSupport, SupportTicketMessage, ClientSupportAssignment, ClientAmc, Staff, SuperAdmin]),
    AwsModule,
  ],
  controllers: [AdminSoftwareSupportController, SuperAdminClientSupportController],
  providers: [
    SupportRepository,
    AdminSoftwareSupportRepository,
    SuperAdminClientSupportRepository,
    SupportService,
    AdminSoftwareSupportService,
    SuperAdminClientSupportService,
  ],
  exports: [TypeOrmModule, SupportRepository, SupportService],
})
export class SupportModule {}
