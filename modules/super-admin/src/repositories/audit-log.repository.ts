import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../../clients/src/entities/audit-log.entity';

/** Mirrors `controllers/suparAdmin/auditLogsController.js`. */
@Injectable()
export class AuditLogRepository {
  constructor(@InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>) {}

  async findAndCount(clientId: number | undefined, employeeId: number | undefined, search: string | undefined, skip: number, take: number) {
    const qb = this.repo
      .createQueryBuilder('log')
      .leftJoin('log.employee', 'employee')
      .addSelect(['employee.id', 'employee.name', 'employee.email', 'employee.empId'])
      .leftJoin('log.client', 'client')
      .addSelect(['client.id', 'client.first_name', 'client.last_name'])
      .leftJoin('client.clientDetails', 'clientDetails')
      .addSelect(['clientDetails.id', 'clientDetails.brandName', 'clientDetails.companyName', 'clientDetails.clientId']);

    if (clientId) qb.andWhere('log.clientId = :clientId', { clientId });
    if (employeeId) qb.andWhere('log.employeeId = :employeeId', { employeeId });

    if (search) {
      qb.andWhere('(log.module LIKE :s OR log.action LIKE :s OR log.entityName LIKE :s OR log.comment LIKE :s)', { s: `%${search}%` });
    }

    qb.orderBy('log.createdAt', 'DESC').skip(skip).take(take);
    return qb.getManyAndCount();
  }

  /** Mirrors `middlewares/superAdmin/auditMiddleware.js`. */
  async createLog(data: Partial<AuditLog>) {
    await this.repo.save(this.repo.create(data));
  }
}
