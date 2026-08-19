import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { ActorType } from 'database/src/enums';
import { Staff } from '../../../clients/src/entities/staff.entity';

@Entity('otps')
@Index(['type_id', 'type'])
export class Otp {
  @PrimaryGeneratedColumn() id: number;
  @Column() type_id: number;
  @Column({ type: 'varchar', length: 255 }) otp: string;
  @Column({ type: 'datetime' }) expires_at: Date;
  @Column({ type: 'enum', enum: ActorType }) type: ActorType;
  @Column({ type: 'varchar', length: 255, nullable: true }) contact: string | null;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => Staff, (staff) => staff.otps, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'type_id' })
  staff?: Staff;
}
