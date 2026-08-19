import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Station } from './station.entity';

@Entity('media')
@Index(['mediable_id', 'mediable_type'])
export class Media {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'int', nullable: true }) mediable_id: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) mediable_type: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) file_name: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) url: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true, default: 'Station' }) entityType: string | null;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => Station, (station) => station.stationMedia, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mediable_id' })
  station?: Station;
}
