import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SuperAdminAuthGuard } from '@modules/auth';
import { AuditLogService } from '../services/audit-log.service';
import { AuditLogQueryDto } from '../dto/audit-log.dto';

/** Mirrors `routes/SuperAdmin/auditLogRoutes.js` + `controllers/suparAdmin/auditLogsController.js`. */
@Controller('v1/super-admin/audit-logs')
@UseGuards(SuperAdminAuthGuard)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  async getAuditLogsList(@Query() query: AuditLogQueryDto) {
    return this.auditLogService.getAuditLogsList(query);
  }
}
