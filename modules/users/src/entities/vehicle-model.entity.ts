import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { VehicleModelStatus } from 'database/src/enums';
import { Brand } from './brand.entity';
import { VehicleCapacity } from './vehicle-capacity.entity';

@Entity('vehiclemodels')
@Index(['brandId'])
export class VehicleModel {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 255, nullable: true }) name: string | null;
  @Column({ type: 'int', nullable: true }) brandId: number | null;
  @Column({ type: 'enum', enum: VehicleModelStatus, default: 'Active' }) status: VehicleModelStatus;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => Brand)
  @JoinColumn({ name: 'brandId' })
  brand: Brand | null;

  @OneToMany(() => VehicleCapacity, (capacity) => capacity.model)
  capacities: VehicleCapacity[];
}
