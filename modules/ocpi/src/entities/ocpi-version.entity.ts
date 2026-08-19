import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { OcpiEmsp } from './ocpi-emsp.entity';
import { OcpiVersionEndpoint } from './ocpi-version-endpoint.entity';

@Entity('ocpiversions')
@Index(['emspId'])
export class OcpiVersion {
  @PrimaryGeneratedColumn() id: number;
  @Column() emspId: number;
  @Column({ type: 'varchar', length: 255 }) version: string;
  @Column({ type: 'varchar', length: 255 }) version_url: string;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => OcpiEmsp)
  @JoinColumn({ name: 'emspId' })
  emsp: OcpiEmsp;

  @OneToMany(() => OcpiVersionEndpoint, (endpoint) => endpoint.version)
  endpoints: OcpiVersionEndpoint[];
}
