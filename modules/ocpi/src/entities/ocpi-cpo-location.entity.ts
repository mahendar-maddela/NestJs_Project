import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { OcpiCpo } from './ocpi-cpo.entity';
import { OcpiCpoEvse } from './ocpi-cpo-evse.entity';

@Entity('ocpicpolocations')
@Index(['cpoId'])
@Index(['locationId'])
export class OcpiCpoLocation {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'int', nullable: true }) cpoId: number | null;
  @Column({ name: 'location_id', type: 'varchar', length: 255 }) locationId: string;
  @Column({ type: 'varchar', length: 2, nullable: true }) country_code: string | null;
  @Column({ type: 'varchar', length: 3, nullable: true }) party_id: string | null;
  @Column({ type: 'boolean', nullable: true, default: true }) publish: boolean | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) name: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) address: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) city: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) postal_code: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) state: string | null;
  @Column({ type: 'varchar', length: 3, nullable: true }) country: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) latitude: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) longitude: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) parking_type: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) time_zone: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) last_updated: string | null;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => OcpiCpo)
  @JoinColumn({ name: 'cpoId' })
  cpo: OcpiCpo | null;

  @OneToMany(() => OcpiCpoEvse, (evse) => evse.location)
  evses: OcpiCpoEvse[];
}
