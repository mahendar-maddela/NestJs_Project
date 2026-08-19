import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { OcpiVersion } from './ocpi-version.entity';

@Entity('ocpiversionendpoints')
@Index(['versionId'])
export class OcpiVersionEndpoint {
  @PrimaryGeneratedColumn() id: number;
  @Column() versionId: number;
  @Column({ type: 'varchar', length: 255, nullable: true }) identifier: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) role: string | null;
  @Column({ type: 'text', nullable: true }) url: string | null;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => OcpiVersion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'versionId' })
  version: OcpiVersion;
}
