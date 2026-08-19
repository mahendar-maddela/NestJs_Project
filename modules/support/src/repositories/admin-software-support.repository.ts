import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { ClientSupport } from '../entities/client-support.entity';
import { SupportTicketMessage } from '../entities/support-ticket-message.entity';
import { ClientAmc } from '../../../billing/src/entities/client-amc.entity';
import { Staff } from '../../../clients/src/entities/staff.entity';

@Injectable()
export class AdminSoftwareSupportRepository {
  constructor(
    @InjectRepository(ClientSupport) private readonly supportRepo: Repository<ClientSupport>,
    @InjectRepository(SupportTicketMessage) private readonly messageRepo: Repository<SupportTicketMessage>,
    @InjectRepository(ClientAmc) private readonly clientAmcRepo: Repository<ClientAmc>,
    @InjectRepository(Staff) private readonly staffRepo: Repository<Staff>,
  ) {}

  async findAndCountTickets(
    clientId: number,
    filters: { status?: string; search?: string },
    skip: number,
    take: number,
  ) {
    const qb = this.supportRepo.createQueryBuilder('support').where('support.clientId = :clientId', { clientId });

    if (filters.status) qb.andWhere('support.status = :status', { status: filters.status });
    if (filters.search) {
      const s = `%${filters.search}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub.where('support.title LIKE :s', { s }).orWhere('support.ticketId LIKE :s', { s });
        }),
      );
    }

    qb.orderBy('support.createdAt', 'DESC').skip(skip).take(take);
    return qb.getManyAndCount();
  }

  createTicket(data: Partial<ClientSupport>) {
    return this.supportRepo.save(this.supportRepo.create(data));
  }

  findTicketById(id: number) {
    return this.supportRepo.findOne({ where: { id } });
  }

  findStaffById(id: number) {
    return this.staffRepo.findOne({ where: { id }, select: { id: true, first_name: true, last_name: true, empId: true, email: true } });
  }

  createMessage(data: Partial<SupportTicketMessage>) {
    return this.messageRepo.save(this.messageRepo.create(data));
  }

  async markSuperAdminMessagesRead(clientSupportId: number) {
    await this.messageRepo.update({ clientSupportId, sender: 'SUPER_ADMIN', isRead: false }, { isRead: true });
  }

  async findAndCountMessages(clientSupportId: number, skip: number, take: number) {
    return this.messageRepo.findAndCount({
      where: { clientSupportId },
      relations: { superAdmin: true, clientEmployee: true },
      order: { createdAt: 'ASC' },
      skip,
      take,
    });
  }

  findLatestClientAmc(clientId: number) {
    return this.clientAmcRepo.findOne({ where: { clientId }, order: { createdAt: 'DESC' } });
  }
}
