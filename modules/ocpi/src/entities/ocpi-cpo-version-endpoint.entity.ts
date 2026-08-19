import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { OcpiCpoVersion } from './ocpi-cpo-version.entity';

@Entity('ocpicpoversionendpoints')
@Index(['versionId'])
export class OcpiCpoVersionEndpoint {
  @PrimaryGeneratedColumn() id: number;
  @Column() versionId: number;
  @Column({ type: 'varchar', length: 255, nullable: true }) identifier: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) role: string | null;
  @Column({ type: 'text', nullable: true }) url: string | null;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => OcpiCpoVersion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'versionId' })
  version: OcpiCpoVersion;
}
