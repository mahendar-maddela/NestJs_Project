import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AwsService } from '@integrations/aws';
import { SuperAdminClientSupportRepository } from '../repositories/super-admin-client-support.repository';
import {
  ClientSupportQueryDto,
  CreateClientSupportDto,
  UpdateClientSupportDto,
  AssignSupportDto,
  StatusUpdateSupportDto,
  SendSupportMessageDto,
} from '../dto/super-admin-client-support.dto';

function ticketEmailHtml(action: string, ticketId: string, title: string | null, name: string): string {
  return `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #333;">
      <h2>Support Ticket ${action}</h2>
      <p>Dear ${name},</p>
      <p>Your support ticket <strong>${ticketId}</strong> (${title ?? ''}) has been ${action.toLowerCase()}.</p>
    </div>
  `;
}

/** Mirrors `controllers/suparAdmin/clientSupportController.js` + `controllers/suparAdmin/messageController.js`. */
@Injectable()
export class SuperAdminClientSupportService {
  constructor(
    private readonly repo: SuperAdminClientSupportRepository,
    private readonly awsService: AwsService,
  ) {}

  async getAllSupports(query: ClientSupportQueryDto) {
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 10;
    const skip = (page - 1) * limit;

    const { rows, count } = await this.repo.findAndCountSupports(
      { status: query.status, clientId: query.clientId ? Number(query.clientId) : undefined, priority: query.priority, date: query.date, search: query.search },
      skip,
      limit,
    );

    return { success: true, message: 'Client Supports fetched successfully', data: rows, pagination: { totalPages: Math.ceil(count / limit), page } };
  }

  async createSupport(superAdminId: number, dto: CreateClientSupportDto) {
    const ticketId = `NXSP${Date.now()}`;

    const support = await this.repo.createTicket({
      clientId: dto.clientId,
      ticketId,
      title: dto.title,
      priority: dto.priority,
      description: dto.description,
      type: dto.type,
      status: 'Pending',
      createdEmp: superAdminId,
    });

    const client = await this.repo.findStaffById(support.clientId);
    if (client?.email) {
      this.awsService
        .sendEmail(client.email, 'Support Ticket Created', 'NexinEv', ticketEmailHtml('Created', support.ticketId ?? '', support.title, `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim()))
        .catch((err) => console.error('Mail failed:', err.message));
    }

    return { success: true, message: 'Client Support created successfully', data: support };
  }

  async getClientSupportById(id: number) {
    const support = await this.repo.findSupportById(id);
    if (!support) {
      throw new NotFoundException({ success: false, message: 'Client Support not found' });
    }
    return { success: true, message: 'Client Support fetched successfully', data: support };
  }

  async assaignSupportToEmployee(id: number, dto: AssignSupportDto) {
    const support = await this.repo.findSupportByIdSimple(id);
    if (!support) {
      throw new NotFoundException({ success: false, message: 'Support Ticket not found' });
    }

    await this.repo.deleteAssignments(id);

    const employeeIds = dto.employeeIds ?? [];
    if (employeeIds.length > 0) {
      await this.repo.bulkCreateAssignments(id, employeeIds);
    }

    return { success: true, message: 'Client Support assigned successfully', data: support };
  }

  async updateSupport(id: number, dto: UpdateClientSupportDto) {
    const support = await this.repo.findSupportByIdSimple(id);
    if (!support) {
      throw new NotFoundException({ success: false, message: 'Client Support not found' });
    }

    await this.repo.updateSupport(id, {
      status: dto.status as any,
      title: dto.title,
      priority: dto.priority,
      type: dto.type,
      description: dto.description,
    });

    const updated = await this.repo.findSupportByIdSimple(id);
    return { success: true, message: 'Client Support updated successfully', data: updated };
  }

  async statusUpdateSupport(id: number, dto: StatusUpdateSupportDto) {
    const support = await this.repo.findSupportByIdWithClientEmployee(id);
    if (!support) {
      throw new NotFoundException({ success: false, message: 'Client Support not found' });
    }

    const employeeWorkedHours = dto.employeeWorkedHours ?? [];
    const calculatedTotalWorkedHours = employeeWorkedHours.reduce((sum, emp) => sum + (emp.workedHours || 0), 0);

    if (dto.status === 'Closed' && dto.totalWorkedHours != (calculatedTotalWorkedHours as any)) {
      throw new BadRequestException({ success: false, message: 'Total worked hours does not match with employee worked hours' });
    }

    for (const employee of employeeWorkedHours) {
      const assignment = await this.repo.findAssignment(id, employee.employeeId);
      if (assignment) {
        await this.repo.updateAssignmentWorkedHours(id, employee.employeeId, employee.workedHours || 0);
      }
    }

    let sendMail = false;

    if (dto.status === 'Closed') {
      const clientAmc = await this.repo.findLatestClientAmcById(support.clientId);
      if (clientAmc) {
        const totalWorkedHours = dto.totalWorkedHours ?? 0;
        let remainingHours = clientAmc.remaining_amc_hours || 0;
        let deductedHours = 0;
        let unbilledHours = 0;

        if (remainingHours >= totalWorkedHours) {
          deductedHours = totalWorkedHours;
          remainingHours -= totalWorkedHours;
        } else {
          deductedHours = remainingHours;
          unbilledHours = totalWorkedHours - remainingHours;
          remainingHours = 0;
        }

        await this.repo.updateClientAmc(clientAmc.id, {
          remaining_amc_hours: remainingHours,
          unbilled_hours: (clientAmc.unbilled_hours || 0) + unbilledHours,
        });

        await this.repo.updateSupport(id, { deducted_amc_hours: deductedHours, usedHours: totalWorkedHours, bill_hours: unbilledHours });
        sendMail = true;
      }
    }

    await this.repo.updateSupport(id, { status: dto.status as any });

    if (sendMail && dto.status === 'Closed') {
      const client = await this.repo.findStaffById(support.clientId);
      if (client?.email) {
        this.awsService
          .sendEmail(client.email, 'Support Ticket Closed', 'NexinEv', ticketEmailHtml('Closed', support.ticketId ?? '', support.title, `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim()))
          .catch((err) => console.error('Mail failed:', err.message));
      }
      if (support.clientEmployee?.email && support.clientEmployee.email !== client?.email) {
        this.awsService
          .sendEmail(
            support.clientEmployee.email,
            'Support Ticket Closed',
            'NexinEv',
            ticketEmailHtml('Closed', support.ticketId ?? '', support.title, `${support.clientEmployee.first_name ?? ''} ${support.clientEmployee.last_name ?? ''}`.trim()),
          )
          .catch((err) => console.error('Mail failed:', err.message));
      }
    }

    if (dto.status === 'Open') {
      const client = await this.repo.findStaffById(support.clientId);
      if (client?.email) {
        this.awsService
          .sendEmail(client.email, 'Support Ticket Opened', 'NexinEv', ticketEmailHtml('Opened', support.ticketId ?? '', support.title, `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim()))
          .catch((err) => console.error('Mail failed:', err.message));
      }
      if (support.clientEmployee?.email && support.clientEmployee.email !== client?.email) {
        this.awsService
          .sendEmail(
            support.clientEmployee.email,
            'Support Ticket Opened',
            'NexinEv',
            ticketEmailHtml('Opened', support.ticketId ?? '', support.title, `${support.clientEmployee.first_name ?? ''} ${support.clientEmployee.last_name ?? ''}`.trim()),
          )
          .catch((err) => console.error('Mail failed:', err.message));
      }
    }

    const updated = await this.repo.findSupportByIdWithClientEmployee(id);
    return { success: true, message: 'Client Support status updated successfully', data: updated };
  }

  async supportStatusCount() {
    const supports = await this.repo.findAllSupportStatuses();
    const pendingSupports = supports.filter((s) => s.status === 'Pending').length;
    const closedSupports = supports.filter((s) => s.status === 'Closed').length;
    const openSupports = supports.filter((s) => s.status === 'Open').length;
    const totalSupports = supports.length;

    return { success: true, message: 'Support status count fetched successfully', data: { pendingSupports, closedSupports, openSupports, totalSupports } };
  }

  async getSupportMessage(supportId: number) {
    await this.repo.markClientMessagesRead(supportId);
    const rows = await this.repo.findMessages(supportId);
    return { success: true, message: 'Messages fetched successfully', data: rows };
  }

  async sendMessage(supportId: number, superAdminId: number, dto: SendSupportMessageDto) {
    const support = await this.repo.findSupportClientId(supportId);
    if (!support) {
      throw new NotFoundException({ success: false, message: 'Support not found' });
    }

    const newMessage = await this.repo.createMessage({
      clientSupportId: supportId,
      superAdminId: superAdminId || null,
      sender: 'SUPER_ADMIN',
      message: dto.message,
      isRead: false,
      clientId: support.clientId,
    });

    return { success: true, message: 'Message sent successfully', data: newMessage };
  }
}
