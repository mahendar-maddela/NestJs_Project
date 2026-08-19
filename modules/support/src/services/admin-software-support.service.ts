import { Injectable, NotFoundException } from '@nestjs/common';
import { AwsService } from '@integrations/aws';
import { AdminSoftwareSupportRepository } from '../repositories/admin-software-support.repository';
import { SoftwareSupportQueryDto, CreateSoftwareSupportDto, SendSoftwareSupportMessageDto } from '../dto/admin-software-support.dto';

function buildTicketCreatedEmailHtml(ticketId: string, title: string | null, name: string): string {
  return `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #333;">
      <h2>Your Support Ticket Has Been Created</h2>
      <p>Dear ${name},</p>
      <p>Your support ticket has been successfully created and is being reviewed by our team.</p>
      <table cellpadding="8" style="border:1px solid #eee;border-radius:6px;">
        <tr><td>Ticket ID</td><td><strong>${ticketId}</strong></td></tr>
        <tr><td>Issue Title</td><td>${title ?? ''}</td></tr>
        <tr><td>Status</td><td>Open</td></tr>
      </table>
      <p>Regards,<br/>Nexinev Support Team</p>
    </div>
  `;
}

/** Mirrors `controllers/admin/softwareSupportController.js`. */
@Injectable()
export class AdminSoftwareSupportService {
  constructor(
    private readonly repo: AdminSoftwareSupportRepository,
    private readonly awsService: AwsService,
  ) {}

  async getAllSupports(clientId: number, query: SoftwareSupportQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const [rows, count] = await this.repo.findAndCountTickets(clientId, { status: query.status, search: query.search }, skip, limit);

    return {
      success: true,
      message: ' Supports fetched successfully',
      data: rows,
      pagination: { totalPages: Math.ceil(count / limit), page },
    };
  }

  async createSupport(clientId: number, staff: { id: number; email?: string; first_name?: string; last_name?: string }, dto: CreateSoftwareSupportDto) {
    const ticketId = `NXSP${Date.now()}`;

    const support = await this.repo.createTicket({
      clientId,
      ticketId,
      title: dto.title,
      type: dto.type,
      description: dto.description,
      status: 'Pending',
      createdBy: staff.id,
    });

    const client = await this.repo.findStaffById(support.clientId);

    if (client?.email) {
      this.awsService
        .sendEmail(client.email, `Support Ticket Created - ${support.ticketId}`, 'Nexinev Support', buildTicketCreatedEmailHtml(support.ticketId!, support.title, `${client.first_name} ${client.last_name}`))
        .catch((err) => console.error('Mail failed:', err.message));

      if (staff.id !== clientId && staff.email && staff.email !== client.email) {
        this.awsService
          .sendEmail(staff.email, `Support Ticket Created - ${support.ticketId}`, 'Nexinev Support', buildTicketCreatedEmailHtml(support.ticketId!, support.title, `${staff.first_name} ${staff.last_name}`))
          .catch((err) => console.error('Mail failed:', err.message));
      }
    }

    return { success: true, message: 'Client Support created successfully', data: support };
  }

  async getSupportTicketBySupportId(supportId: number) {
    const support = await this.repo.findTicketById(supportId);
    if (!support) {
      throw new NotFoundException({ success: false, message: 'Client Support not found' });
    }
    return { success: true, message: 'Client Support fetched successfully', data: support };
  }

  async sendSoftwareSupport(supportId: number, clientRecordId: number, staffId: number, dto: SendSoftwareSupportMessageDto) {
    const newMessage = await this.repo.createMessage({
      clientSupportId: supportId,
      clientId: clientRecordId,
      clientEmpId: staffId,
      sender: 'CLIENT',
      message: dto.message,
      isRead: false,
    });

    return { success: true, message: 'Message sent successfully', data: newMessage };
  }

  async getSoftwareSupportMessage(supportId: number, page: number, limit: number) {
    await this.repo.markSuperAdminMessagesRead(supportId);

    const skip = (page - 1) * limit;
    const [rows, count] = await this.repo.findAndCountMessages(supportId, skip, limit);

    return {
      success: true,
      message: 'Messages fetched successfully',
      data: rows,
      pagination: { totalPages: Math.ceil(count / limit), page },
    };
  }

  async supportCardStacks(clientId: number) {
    const amc = await this.repo.findLatestClientAmc(clientId);
    return { success: true, message: 'AMC deatils fetched successfully', data: amc };
  }
}
