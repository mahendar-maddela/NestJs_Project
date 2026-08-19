import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { FleetUserType, FleetUserStatus } from 'database/src/enums';
import { Staff } from '../../../clients/src/entities/staff.entity';
import { FleetUserDetail } from './fleet-user-detail.entity';

@Entity('fleetusers')
@Index(['clientId'])
export class FleetUser {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 255, nullable: true }) name: string | null;
  @Column({ type: 'int', nullable: true }) fleetId: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) phone: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) email: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) licenseNumber: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) aadharNumber: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) panNumber: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) password: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) address: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) drId: string | null;
  @Column({ type: 'enum', enum: FleetUserType, default: 'DRIVER' }) type: FleetUserType;
  @Column({ type: 'enum', enum: FleetUserStatus, default: 'Active' }) status: FleetUserStatus;
  @Column() clientId: number;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'clientId' })
  client: Staff;

  @ManyToOne('FleetUserDetail')
  @JoinColumn({ name: 'fleetId' })
  fleetDetail?: FleetUserDetail;
}
