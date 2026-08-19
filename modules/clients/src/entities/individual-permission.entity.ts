import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Staff } from './staff.entity';
import { Permission } from './permission.entity';

@Entity('individualpermissions')
export class IndividualPermission {
  @PrimaryColumn() permissionId: number;
  @PrimaryColumn({ type: 'int', default: 0 }) staffId: number;
  @Column({ type: 'int', nullable: true }) vendorId: number | null;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'staffId' })
  staff: Staff | null;

  @ManyToOne(() => Permission)
  @JoinColumn({ name: 'permissionId' })
  permission: Permission | null;
}
