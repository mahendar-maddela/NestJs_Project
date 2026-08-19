import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ClientSupport } from './client-support.entity';
import { SuperAdmin } from '../../../super-admin/src/entities/super-admin.entity';
import { Staff } from '../../../clients/src/entities/staff.entity';

const SUPPORT_MESSAGE_SENDERS = ['CLIENT', 'SUPER_ADMIN'] as const;
type SupportMessageSender = (typeof SUPPORT_MESSAGE_SENDERS)[number];

@Entity('supportticketmessages')
@Index(['clientSupportId'])
export class SupportTicketMessage {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'int', nullable: true }) clientSupportId: number | null;
  @Column({ type: 'int', nullable: true }) superAdminId: number | null;
  @Column({ type: 'enum', enum: SUPPORT_MESSAGE_SENDERS, nullable: true }) sender: SupportMessageSender | null;
  @Column({ type: 'boolean', nullable: true, default: false }) isRead: boolean | null;
  @Column({ type: 'text', nullable: true }) message: string | null;
  @Column({ type: 'int', nullable: true }) clientId: number | null;
  @Column({ type: 'int', nullable: true }) clientEmpId: number | null;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => ClientSupport, (ticket) => ticket.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clientSupportId' })
  ticket: ClientSupport;

  @ManyToOne(() => SuperAdmin)
  @JoinColumn({ name: 'superAdminId' })
  superAdmin: SuperAdmin | null;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'clientEmpId' })
  clientEmployee: Staff | null;
}
