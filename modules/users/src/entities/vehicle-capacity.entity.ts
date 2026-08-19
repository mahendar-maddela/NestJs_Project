import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { VehicleModel } from './vehicle-model.entity';

@Entity('vehiclecapacities')
@Index(['modelId'])
export class VehicleCapacity {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'int', nullable: true }) modelId: number | null;
  @Column({ type: 'float', nullable: true }) capacity: number | null;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => VehicleModel)
  @JoinColumn({ name: 'modelId' })
  model: VehicleModel | null;
}
