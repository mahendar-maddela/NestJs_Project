import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Staff } from '../../../clients/src/entities/staff.entity';
import { User } from './user.entity';
import { VehicleModel } from './vehicle-model.entity';
import { VehicleCapacity } from './vehicle-capacity.entity';
import { FleetUserDetail } from '../../../fleet/src/entities/fleet-user-detail.entity';
import { FleetVehicleGroup } from '../../../fleet/src/entities/fleet-vehicle-group.entity';

@Entity('vehicles')
@Index(['clientId'])
@Index(['userId'])
@Index(['fleetId'])
@Index(['regNo'])
export class Vehicle {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'int', nullable: true }) userId: number | null;
  @Column({ type: 'int', nullable: true }) modelId: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) vinNumber: string | null;
  @Column({ type: 'boolean', default: false }) autoCharge: boolean;
  @Column({ type: 'varchar', length: 255, nullable: true }) regNo: string | null;
  @Column({ type: 'float', nullable: true }) maxAmount: number | null;
  @Column({ type: 'int', nullable: true }) fleetGroupId: number | null;
  @Column({ type: 'int', nullable: true }) fleetId: number | null;
  @Column({ type: 'float', nullable: true }) range: number | null;
  @Column({ type: 'int', nullable: true }) capacityId: number | null;
  @Column({ type: 'boolean', default: false }) isPrimary: boolean;
  @Column() clientId: number;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;
  @Column({ type: 'datetime', nullable: true }) deletedAt: Date | null;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'clientId' })
  client: Staff;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @ManyToOne(() => VehicleModel)
  @JoinColumn({ name: 'modelId' })
  model: VehicleModel | null;

  @ManyToOne(() => VehicleCapacity)
  @JoinColumn({ name: 'capacityId' })
  capacity: VehicleCapacity | null;

  @ManyToOne(() => FleetUserDetail)
  @JoinColumn({ name: 'fleetId' })
  fleet: FleetUserDetail | null;

  @ManyToOne(() => FleetVehicleGroup)
  @JoinColumn({ name: 'fleetGroupId' })
  fleetGroup: FleetVehicleGroup | null;
}
