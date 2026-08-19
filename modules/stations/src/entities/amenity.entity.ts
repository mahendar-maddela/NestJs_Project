import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { AmenityStatus } from 'database/src/enums';
import { VendorTypeAmenity } from '../../../vendors/src/entities/vendor-type-amenity.entity';
import { StationAmenity } from './station-amenity.entity';

@Entity('amenities')
export class Amenity {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 255, nullable: true }) name: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) image: string | null;
  @Column({ type: 'enum', enum: AmenityStatus, default: 'Active' }) status: AmenityStatus;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @OneToMany(() => StationAmenity, (sa) => sa.amenity)
  stationAmenities: StationAmenity[];

  @OneToMany(() => VendorTypeAmenity, (vta) => vta.amenity)
  vendorTypeAmenities: VendorTypeAmenity[];
}
