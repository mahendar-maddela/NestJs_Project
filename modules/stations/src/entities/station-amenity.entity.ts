import { Entity, PrimaryColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Station } from './station.entity';
import { Amenity } from './amenity.entity';

@Entity('stationamenities')
export class StationAmenity {
  @PrimaryColumn() stationId: number;
  @PrimaryColumn() amenityId: number;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => Station, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stationId' })
  station: Station;

  @ManyToOne(() => Amenity, (amenity) => amenity.stationAmenities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'amenityId' })
  amenity: Amenity;
}
