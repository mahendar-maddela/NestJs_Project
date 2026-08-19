import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Staff } from '../../../clients/src/entities/staff.entity';
import { Vehicle } from '../../../users/src/entities/vehicle.entity';
import { FleetUser } from './fleet-user.entity';

@Entity('fleetdrivervehicles')
@Index(['clientId'])
@Index(['fleetDriverId'])
@Index(['vehicleId'])
export class FleetDriverVehicle {
  @PrimaryGeneratedColumn() id: number;
  @Column() fleetDriverId: number;
  @Column() vehicleId: number;
  @Column({ type: 'datetime', nullable: true }) startDate: Date | null;
  @Column({ type: 'datetime', nullable: true }) endDate: Date | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) startTime: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) endTime: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) status: string | null;
  @Column() clientId: number;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'clientId' })
  client: Staff;

  @ManyToOne(() => FleetUser)
  @JoinColumn({ name: 'fleetDriverId' })
  fleetDriver: FleetUser;

  @ManyToOne(() => Vehicle)
  @JoinColumn({ name: 'vehicleId' })
  vehicle: Vehicle;
}
