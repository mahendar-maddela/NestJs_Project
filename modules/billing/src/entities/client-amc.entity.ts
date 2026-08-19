import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ClientAmcStatus } from 'database/src/enums';
import { Staff } from '../../../clients/src/entities/staff.entity';

@Entity('clientamcs')
@Index(['clientId'])
export class ClientAmc {
  @PrimaryGeneratedColumn() id: number;
  @Column() clientId: number;
  @Column({ type: 'datetime', nullable: true }) startDate: Date | null;
  @Column({ type: 'datetime', nullable: true }) endDate: Date | null;
  @Column({ type: 'float', nullable: true }) standard_amc_hours: number | null;
  @Column({ type: 'float', nullable: true }) total_amc_hours: number | null;
  @Column({ type: 'int', nullable: true }) charger_amc_count: number | null;
  @Column({ type: 'float', nullable: true }) remaining_amc_hours: number | null;
  @Column({ type: 'int', nullable: true }) chargers_for_increment: number | null;
  @Column({ type: 'float', nullable: true }) increment_hours: number | null;
  @Column({ type: 'float', nullable: true }) unbilled_hours: number | null;
  @Column({ type: 'float', nullable: true }) usedHours: number | null;
  @Column({ type: 'enum', enum: ClientAmcStatus, nullable: true }) status: ClientAmcStatus | null;
  @Column({ type: 'datetime', nullable: true }) last_cycle_processed_at: Date | null;
  @Column({ type: 'float', nullable: true, default: 0 }) applied_increment_hours: number | null;
  @Column({ type: 'float', nullable: true }) amc_amount: number | null;
  @Column({ type: 'float', nullable: true }) amc_incremental_amount: number | null;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'clientId' })
  client: Staff;
}
