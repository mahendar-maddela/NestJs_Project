import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { OcpiCpo } from './ocpi-cpo.entity';

@Entity('ocpicpotariffs')
@Index(['cpoId'])
@Index(['tariff_id'])
export class OcpiCpoTariff {
  @PrimaryGeneratedColumn() id: number;
  @Column() cpoId: number;
  @Column({ type: 'varchar', length: 2, nullable: true }) country_code: string | null;
  @Column({ type: 'varchar', length: 3, nullable: true }) party_id: string | null;
  @Column({ type: 'varchar', length: 255 }) tariff_id: string;
  @Column({ type: 'varchar', length: 3, nullable: true }) currency: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) type: string | null;
  @Column({ type: 'json', nullable: true }) tariff_alt_text: unknown;
  @Column({ type: 'text', nullable: true }) tariff_alt_url: string | null;
  @Column({ type: 'float', nullable: true }) min_price: number | null;
  @Column({ type: 'float', nullable: true }) max_price: number | null;
  @Column({ type: 'json', nullable: true }) elements: unknown;
  @Column({ type: 'varchar', length: 255, nullable: true }) start_date_time: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) end_date_time: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) last_updated: string | null;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => OcpiCpo)
  @JoinColumn({ name: 'cpoId' })
  cpo: OcpiCpo;
}
