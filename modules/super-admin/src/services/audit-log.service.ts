import { Injectable } from '@nestjs/common';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { AuditLogQueryDto } from '../dto/audit-log.dto';

/** Mirrors `controllers/suparAdmin/auditLogsController.js`. */
@Injectable()
export class AuditLogService {
  constructor(private readonly repo: AuditLogRepository) {}

  async getAuditLogsList(query: AuditLogQueryDto) {
    const page = Math.max(parseInt(query.page ?? '', 10) || 1, 1);
    const limit = Math.max(parseInt(query.limit ?? '', 10) || 20, 1);
    const skip = (page - 1) * limit;

    const clientId = query.clientId ? Number(query.clientId) : undefined;
    const employeeId = query.employeeId ? Number(query.employeeId) : undefined;

    const [rows, count] = await this.repo.findAndCount(clientId, employeeId, query.search, skip, limit);

    return {
      success: true,
      message: 'Audit logs fetched successfully.',
      data: rows,
      pagination: { totalItems: count, totalPages: Math.ceil(count / limit), currentPage: page },
    };
  }
}
