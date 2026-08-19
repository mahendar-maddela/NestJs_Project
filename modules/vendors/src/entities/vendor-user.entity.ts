import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Staff } from '../../../clients/src/entities/staff.entity';
import { User } from '../../../users/src/entities/user.entity';
import { Vendor } from './vendor.entity';
import { UserType } from './user-type.entity';
import { FleetVehicleGroup } from '../../../fleet/src/entities/fleet-vehicle-group.entity';

@Entity('vendorusers')
@Index(['clientId'])
@Index(['vendorId'])
@Index(['userTypeId'])
@Index(['userId'])
export class VendorUser {
  @PrimaryGeneratedColumn() id: number;
  @Column() userTypeId: number;
  @Column() vendorId: number;
  @Column({ type: 'int', nullable: true }) userId: number | null;
  @Column({ type: 'int', nullable: true }) fleetGroupId: number | null;
  @Column({ type: 'varchar', length: 255, default: 'Active' }) status: string;
  @Column() clientId: number;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'clientId' })
  client: Staff;

  @ManyToOne(() => Vendor)
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @ManyToOne(() => UserType)
  @JoinColumn({ name: 'userTypeId' })
  userType: UserType;

  @ManyToOne(() => FleetVehicleGroup)
  @JoinColumn({ name: 'fleetGroupId' })
  fleetGroup: FleetVehicleGroup | null;
}
