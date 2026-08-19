import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Staff } from '../../../clients/src/entities/staff.entity';
import { User } from '../../../users/src/entities/user.entity';
import { Vendor } from '../../../vendors/src/entities/vendor.entity';
import { FleetUserDetail } from './fleet-user-detail.entity';
import type { FleetVehicleGroup } from './fleet-vehicle-group.entity';

@Entity('rfidtags')
@Index(['clientId'])
@Index(['rfIdTag'])
@Index(['userId'])
export class RfidTag {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 255 }) rfIdTag: string;
  @Column({ type: 'int', nullable: true }) userId: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) expiryDate: string | null;
  @Column({ type: 'int', nullable: true }) masterRfidTag: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) comments: string | null;
  @Column({ type: 'int', nullable: true }) vendorId: number | null;
  @Column({ type: 'float', nullable: true }) maxAmount: number | null;
  @Column({ type: 'int', nullable: true }) staffId: number | null;
  @Column({ type: 'int', nullable: true }) fleetId: number | null;
  @Column({ type: 'int', nullable: true }) fleetGroupId: number | null;
  @Column() clientId: number;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'clientId' })
  client: Staff;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @ManyToOne(() => Vendor)
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor | null;

  @ManyToOne(() => RfidTag)
  @JoinColumn({ name: 'masterRfidTag' })
  masterTag: RfidTag | null;

  @ManyToOne(() => FleetUserDetail)
  @JoinColumn({ name: 'fleetId' })
  fleet: FleetUserDetail | null;

  @ManyToOne('FleetVehicleGroup')
  @JoinColumn({ name: 'fleetGroupId' })
  fleetGroup: FleetVehicleGroup | null;

  @ManyToOne('FleetVehicleGroup')
  @JoinColumn({ name: 'fleetGroupId' })
  fleetVehicleGroup: FleetVehicleGroup | null;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'staffId' })
  staff: Staff | null;
}
