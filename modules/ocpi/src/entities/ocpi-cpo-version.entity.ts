import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { OcpiCpo } from './ocpi-cpo.entity';
import { OcpiCpoVersionEndpoint } from './ocpi-cpo-version-endpoint.entity';

@Entity('ocpicpoversions')
@Index(['cpoId'])
export class OcpiCpoVersion {
  @PrimaryGeneratedColumn() id: number;
  @Column() cpoId: number;
  @Column({ type: 'varchar', length: 255 }) version: string;
  @Column({ name: 'version_url', type: 'varchar', length: 255 }) url: string;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => OcpiCpo)
  @JoinColumn({ name: 'cpoId' })
  cpo: OcpiCpo;

  @OneToMany(() => OcpiCpoVersionEndpoint, (endpoint) => endpoint.version)
  endpoints: OcpiCpoVersionEndpoint[];
}
