import { Entity, PrimaryColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Amenity } from '../../../stations/src/entities/amenity.entity';

@Entity('vendortypeamenities')
export class VendorTypeAmenity {
  @PrimaryColumn() vendorTypeId: number;
  @PrimaryColumn() amenityId: number;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => Amenity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'amenityId' })
  amenity: Amenity | null;
}
