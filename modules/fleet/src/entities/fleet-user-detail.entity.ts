import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { FleetUserStatus } from 'database/src/enums';
import { Staff } from '../../../clients/src/entities/staff.entity';
import { Vendor } from '../../../vendors/src/entities/vendor.entity';
import { FleetUser } from './fleet-user.entity';
import type { FleetVehicleGroup } from './fleet-vehicle-group.entity';
import type { Vehicle } from '../../../users/src/entities/vehicle.entity';

@Entity('fleetuserdetails')
@Index(['clientId'])
@Index(['vendorId'])
export class FleetUserDetail {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 255, nullable: true }) cName: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) gst: string | null;
  @Column({ type: 'int', nullable: true }) noOfGroups: number | null;
  @Column({ type: 'int', nullable: true }) noOfVehicle: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) fleetUId: string | null;
  @Column({ type: 'int', nullable: true }) noOfDrivers: number | null;
  @Column({ type: 'boolean', nullable: true, default: false }) remoteStart: boolean | null;
  @Column({ type: 'int', nullable: true }) staffId: number | null;
  @Column({ type: 'int', nullable: true }) vendorId: number | null;
  @Column() clientId: number;
  @Column({ type: 'enum', enum: FleetUserStatus, default: 'Active' }) status: FleetUserStatus;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'clientId' })
  client: Staff;

  @ManyToOne(() => Vendor)
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor | null;

  @OneToMany(() => FleetUser, (fu) => fu.fleetDetail)
  fleetUsers?: FleetUser[];

  @OneToMany('FleetVehicleGroup', 'fleet')
  fleetVehicleGroups?: FleetVehicleGroup[];

  @OneToMany('Vehicle', 'fleet')
  vehicles?: Vehicle[];
}
