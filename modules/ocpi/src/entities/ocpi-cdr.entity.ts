import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { OcpiEmsp } from './ocpi-emsp.entity';
import { OcpiToken } from './ocpi-token.entity';

@Entity('ocpicdrs')
@Index(['emspId'])
@Index(['session_id'])
export class OcpiCdr {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 255, nullable: true }) country_code: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) party_id: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) session_id: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) start_date_time: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) end_date_time: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) auth_method: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) location_id: string | null;
  @Column({ type: 'int', nullable: true }) evse_uid: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) connector_id: string | null;
  @Column({ type: 'float', nullable: true }) total_energy_kwh: number | null;
  @Column({ type: 'json', nullable: true }) charging_periods: unknown;
  @Column({ type: 'varchar', length: 255, nullable: true }) currency: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) tariff_id: string | null;
  @Column({ type: 'json', nullable: true }) total_cost: unknown;
  @Column({ type: 'int', nullable: true }) tokenId: number | null;
  @Column({ type: 'int', nullable: true }) emspId: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) remark: string | null;
  @Column({ type: 'json', nullable: true }) cdr_token: unknown;
  @Column({ type: 'json', nullable: true }) cdr_location: unknown;
  @Column({ type: 'json', nullable: true }) tariffs: unknown;
  @Column({ type: 'json', nullable: true }) total_time: unknown;
  @Column({ type: 'varchar', length: 255, nullable: true }) authorization_reference: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) last_updated: string | null;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => OcpiEmsp)
  @JoinColumn({ name: 'emspId' })
  emsp: OcpiEmsp | null;

  @ManyToOne(() => OcpiToken)
  @JoinColumn({ name: 'tokenId' })
  token: OcpiToken | null;
}
