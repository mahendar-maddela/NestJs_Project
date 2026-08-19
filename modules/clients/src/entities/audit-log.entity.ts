import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Staff } from './staff.entity';
import { SuperAdmin } from '../../../super-admin/src/entities/super-admin.entity';

@Entity('auditlogs')
@Index(['clientId'])
export class AuditLog {
  @PrimaryGeneratedColumn() id: number;
  @Column() employeeId: number;
  @Column() clientId: number;
  @Column({ type: 'varchar', length: 255 }) module: string;
  @Column({ type: 'varchar', length: 255 }) action: string;
  @Column({ type: 'varchar', length: 255 }) entityId: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) entityName: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) field: string | null;
  @Column({ type: 'json', nullable: true }) oldValue: unknown | null;
  @Column({ type: 'json', nullable: true }) newValue: unknown | null;
  @Column({ type: 'text' }) comment: string;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'clientId' })
  client: Staff;

  @ManyToOne(() => SuperAdmin)
  @JoinColumn({ name: 'employeeId' })
  employee: SuperAdmin;
}
