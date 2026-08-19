import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { Staff } from '../../../clients/src/entities/staff.entity';
import { Vendor } from '../../../vendors/src/entities/vendor.entity';
import { FleetUserDetail } from './fleet-user-detail.entity';
import type { Vehicle } from '../../../users/src/entities/vehicle.entity';
import type { RfidTag } from './rfid-tag.entity';
import type { VendorUser } from '../../../vendors/src/entities/vendor-user.entity';

@Entity('fleetvehiclegroups')
@Index(['clientId'])
@Index(['fleetId'])
export class FleetVehicleGroup {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 255, nullable: true }) name: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) groupId: string | null;
  @Column() fleetId: number;
  @Column({ type: 'int', nullable: true }) staffId: number | null;
  @Column({ type: 'int', nullable: true }) vendorId: number | null;
  @Column() clientId: number;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'clientId' })
  client: Staff;

  @ManyToOne(() => FleetUserDetail)
  @JoinColumn({ name: 'fleetId' })
  fleet: FleetUserDetail;

  @ManyToOne(() => Vendor)
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor | null;

  @OneToMany('Vehicle', 'fleetGroup')
  vehicles?: Vehicle[];

  @OneToMany('RfidTag', 'fleetGroup')
  rfidTags?: RfidTag[];

  @OneToMany('VendorUser', 'fleetGroup')
  vendorUserTypes?: VendorUser[];
}
