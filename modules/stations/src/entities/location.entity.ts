import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { Station } from './station.entity';

@Entity('locations')
export class Location {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 255, nullable: true }) latitude: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) longitude: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) address: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) city: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) state: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) country: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) pincode: string | null;
  @Column({ unique: true }) stationId: number;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @OneToOne(() => Station, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stationId' })
  station: Station;
}
