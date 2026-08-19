import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { OcpiCpo } from './ocpi-cpo.entity';

const CDR_AUTH_METHODS = ['AUTH_REQUEST', 'COMMAND', 'WHITELIST'] as const;
type CdrAuthMethod = (typeof CDR_AUTH_METHODS)[number];

@Entity('ocpicpocdrs')
@Index(['cpo_id'])
export class OcpiCpoCdr {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'int', nullable: true }) cpo_id: number | null;
  @Column({ type: 'varchar', length: 255 }) country_code: string;
  @Column({ type: 'varchar', length: 255 }) party_id: string;
  @Column({ type: 'varchar', length: 255 }) cdr_id: string;
  @Column({ type: 'datetime' }) start_date_time: Date;
  @Column({ type: 'datetime' }) end_date_time: Date;
  @Column({ type: 'varchar', length: 255 }) session_id: string;
  @Column({ type: 'json' }) cdr_token: unknown;
  @Column({ type: 'enum', enum: CDR_AUTH_METHODS, default: 'COMMAND' }) auth_method: CdrAuthMethod;
  @Column({ type: 'varchar', length: 255 }) authorization_reference: string;
  @Column({ type: 'json' }) cdr_location: unknown;
  @Column({ type: 'varchar', length: 255, nullable: true }) meter_id: string | null;
  @Column({ type: 'varchar', length: 255 }) currency: string;
  @Column({ type: 'json' }) tariffs: unknown;
  @Column({ type: 'json' }) charging_periods: unknown;
  @Column({ type: 'json', nullable: true }) signed_data: unknown | null;
  @Column({ type: 'json' }) total_cost: unknown;
  @Column({ type: 'json', nullable: true }) total_fixed_cost: unknown | null;
  @Column({ type: 'float' }) total_energy: number;
  @Column({ type: 'json', nullable: true }) total_energy_cost: unknown | null;
  @Column({ type: 'float' }) total_time: number;
  @Column({ type: 'json', nullable: true }) total_time_cost: unknown | null;
  @Column({ type: 'float', nullable: true }) total_parking_time: number | null;
  @Column({ type: 'json', nullable: true }) total_parking_cost: unknown | null;
  @Column({ type: 'json', nullable: true }) total_reservation_cost: unknown | null;
  @Column({ type: 'text', nullable: true }) remark: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) invoice_reference_id: string | null;
  @Column({ type: 'boolean', nullable: true, default: false }) credit: boolean | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) credit_reference_id: string | null;
  @Column({ type: 'boolean', nullable: true, default: false }) home_charging_compensation: boolean | null;
  @Column({ type: 'datetime' }) last_updated: Date;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => OcpiCpo)
  @JoinColumn({ name: 'cpo_id' })
  cpo: OcpiCpo | null;
}
