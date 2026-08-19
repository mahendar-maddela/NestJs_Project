import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Staff } from '../../../clients/src/entities/staff.entity';
import { InternalRoaming } from './internal-roaming.entity';

@Entity('roamingclients')
export class RoamingClient {
  @PrimaryGeneratedColumn() id: number;
  @Column() importClientId: number;
  @Column() exportClientId: number;
  @Column({ type: 'datetime' }) joinedAt: Date;
  @Column({ type: 'varchar', length: 255, default: 'ACTIVE' }) status: string;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'importClientId' })
  importClient: Staff;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'exportClientId' })
  exportClient: Staff;

  @OneToMany(() => InternalRoaming, (ir) => ir.roamingClient)
  roamingChargers?: InternalRoaming[];
}
