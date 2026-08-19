import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { ClientSupport } from '../entities/client-support.entity';
import { ClientSupportAssignment } from '../entities/client-support-assignment.entity';
import { SupportTicketMessage } from '../entities/support-ticket-message.entity';
import { Staff } from '../../../clients/src/entities/staff.entity';
import { SuperAdmin } from '../../../super-admin/src/entities/super-admin.entity';
import { ClientAmc } from '../../../billing/src/entities/client-amc.entity';

export interface ClientSupportListFilters {
  status?: string;
  clientId?: number;
  priority?: string;
  date?: string;
  search?: string;
}

/** Mirrors `controllers/suparAdmin/clientSupportController.js` + `controllers/suparAdmin/messageController.js`. */
@Injectable()
export class SuperAdminClientSupportRepository {
  constructor(
    @InjectRepository(ClientSupport) private readonly supportRepo: Repository<ClientSupport>,
    @InjectRepository(ClientSupportAssignment) private readonly assignmentRepo: Repository<ClientSupportAssignment>,
    @InjectRepository(SupportTicketMessage) private readonly messageRepo: Repository<SupportTicketMessage>,
    @InjectRepository(Staff) private readonly staffRepo: Repository<Staff>,
    @InjectRepository(SuperAdmin) private readonly superAdminRepo: Repository<SuperAdmin>,
    @InjectRepository(ClientAmc) private readonly clientAmcRepo: Repository<ClientAmc>,
  ) {}

  // Legacy's `search` branch replaces the whole where object outright, dropping status/clientId/
  // priority/date filters whenever search is also supplied — preserved exactly.
  async findAndCountSupports(filters: ClientSupportListFilters, skip: number, take: number) {
    const qb = this.supportRepo
      .createQueryBuilder('support')
      .leftJoinAndSelect('support.client', 'client')
      .leftJoinAndSelect('client.clientDetails', 'clientDetails')
      .leftJoinAndSelect('support.clientEmployee', 'clientEmployee')
      .leftJoinAndSelect('support.createdEmployee', 'createdEmployee');

    if (filters.search) {
      const s = `%${filters.search}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub.where('support.title LIKE :s', { s }).orWhere('support.ticketId LIKE :s', { s });
        }),
      );
    } else {
      if (filters.status) qb.andWhere('support.status = :status', { status: filters.status });
      if (filters.clientId) qb.andWhere('support.clientId = :clientId', { clientId: filters.clientId });
      if (filters.priority) qb.andWhere('support.priority = :priority', { priority: filters.priority });
      if (filters.date) {
        const start = new Date(filters.date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(filters.date);
        end.setHours(23, 59, 59, 999);
        qb.andWhere('support.createdAt BETWEEN :start AND :end', { start, end });
      }
    }

    qb.orderBy('support.id', 'DESC').skip(skip).take(take);
    const [rows, count] = await qb.getManyAndCount();

    const assignedByTicket = await this.findAssignedEmployeesByTicketIds(rows.map((r) => r.id));
    const data = rows.map((r) => ({ ...r, assignedEmployees: assignedByTicket.get(r.id) ?? [] }));

    return { rows: data, count };
  }

  createTicket(data: Partial<ClientSupport>) {
    return this.supportRepo.save(this.supportRepo.create(data));
  }

  findStaffById(id: number) {
    return this.staffRepo.findOne({ where: { id }, select: { id: true, first_name: true, last_name: true, empId: true, email: true } });
  }

  async findSupportById(id: number) {
    const support = await this.supportRepo.findOne({
      where: { id },
      relations: { client: true, clientEmployee: true, createdEmployee: true },
    });
    if (!support) return null;

    const assigned = await this.findAssignedEmployeesByTicketIds([id]);
    return { ...support, assignedEmployees: assigned.get(id) ?? [] };
  }

  async findSupportByIdWithClientEmployee(id: number) {
    return this.supportRepo.findOne({ where: { id }, relations: { clientEmployee: true } });
  }

  findSupportByIdSimple(id: number) {
    return this.supportRepo.findOne({ where: { id }, select: { id: true } });
  }

  findSupportClientId(id: number) {
    return this.supportRepo.findOne({ where: { id }, select: { id: true, clientId: true } });
  }

  async updateSupport(id: number, data: QueryDeepPartialEntity<ClientSupport>) {
    await this.supportRepo.update(id, data);
  }

  async deleteAssignments(clientSupportId: number) {
    await this.assignmentRepo.delete({ clientSupportId });
  }

  async bulkCreateAssignments(clientSupportId: number, employeeIds: number[]) {
    if (!employeeIds.length) return;
    await this.assignmentRepo.save(employeeIds.map((superAdminId) => this.assignmentRepo.create({ clientSupportId, superAdminId })));
  }

  findAssignment(clientSupportId: number, superAdminId: number) {
    return this.assignmentRepo.findOne({ where: { clientSupportId, superAdminId } });
  }

  async updateAssignmentWorkedHours(clientSupportId: number, superAdminId: number, workedHours: number) {
    await this.assignmentRepo.update({ clientSupportId, superAdminId }, { workedHours });
  }

  private async findAssignedEmployeesByTicketIds(ticketIds: number[]): Promise<Map<number, SuperAdmin[]>> {
    const map = new Map<number, SuperAdmin[]>();
    if (!ticketIds.length) return map;

    const rows = await this.assignmentRepo
      .createQueryBuilder('assignment')
      .innerJoinAndSelect(SuperAdmin, 'sa', 'sa.id = assignment.superAdminId')
      .where('assignment.clientSupportId IN (:...ticketIds)', { ticketIds })
      .select(['assignment.clientSupportId AS ticketId', 'sa.id AS id', 'sa.name AS name', 'sa.empId AS empId'])
      .getRawMany<{ ticketId: number; id: number; name: string | null; empId: string | null }>();

    for (const row of rows) {
      const list = map.get(row.ticketId) ?? [];
      list.push({ id: row.id, name: row.name, empId: row.empId } as SuperAdmin);
      map.set(row.ticketId, list);
    }
    return map;
  }

  findLatestClientAmcById(clientId: number) {
    return this.clientAmcRepo.findOne({ where: { clientId }, order: { id: 'DESC' } });
  }

  async updateClientAmc(id: number, data: QueryDeepPartialEntity<ClientAmc>) {
    await this.clientAmcRepo.update(id, data);
  }

  findAllSupportStatuses() {
    return this.supportRepo.find({ select: { id: true, status: true } });
  }

  async markClientMessagesRead(clientSupportId: number) {
    await this.messageRepo.update({ clientSupportId, sender: 'CLIENT', isRead: false }, { isRead: true });
  }

  findMessages(clientSupportId: number) {
    return this.messageRepo.find({
      where: { clientSupportId },
      relations: { superAdmin: true, clientEmployee: true },
      order: { createdAt: 'ASC' },
      select: { superAdmin: { id: true, empId: true, name: true }, clientEmployee: { id: true, first_name: true, last_name: true } },
    });
  }

  createMessage(data: Partial<SupportTicketMessage>) {
    return this.messageRepo.save(this.messageRepo.create(data));
  }
}
