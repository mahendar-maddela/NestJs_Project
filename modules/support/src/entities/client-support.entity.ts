import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { SupportTicketStatus } from 'database/src/enums';
import { Staff } from '../../../clients/src/entities/staff.entity';
import { SupportTicketMessage } from './support-ticket-message.entity';
import { SuperAdmin } from '../../../super-admin/src/entities/super-admin.entity';

@Entity('clientsupports')
@Index(['clientId'])
@Index(['ticketId'])
export class ClientSupport {
  @PrimaryGeneratedColumn() id: number;
  @Column() clientId: number;
  @Column({ type: 'varchar', length: 255, nullable: true }) ticketId: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) title: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) priority: string | null;
  @Column({ type: 'int', nullable: true }) createdBy: number | null;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) type: string | null;
  @Column({ type: 'float', nullable: true }) deducted_amc_hours: number | null;
  @Column({ type: 'enum', enum: SupportTicketStatus, default: 'Pending' }) status: SupportTicketStatus;
  @Column({ type: 'float', nullable: true }) usedHours: number | null;
  @Column({ type: 'float', nullable: true }) bill_hours: number | null;
  @Column({ type: 'int', nullable: true }) createdEmp: number | null;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'clientId' })
  client: Staff;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'createdBy' })
  clientEmployee: Staff | null;

  @ManyToOne(() => SuperAdmin)
  @JoinColumn({ name: 'createdEmp' })
  createdEmployee: SuperAdmin | null;

  @OneToMany(() => SupportTicketMessage, (message) => message.ticket)
  messages: SupportTicketMessage[];
}
