import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { OcpiCpoEvse } from './ocpi-cpo-evse.entity';

@Entity('ocpicpoconnectors')
@Index(['evseId'])
export class OcpiCpoConnector {
  @PrimaryGeneratedColumn() id: number;
  @Column() evseId: number;
  @Column({ type: 'varchar', length: 255 }) connector_id: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) standard: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) format: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) power_type: string | null;
  @Column({ type: 'int', nullable: true }) max_voltage: number | null;
  @Column({ type: 'int', nullable: true }) max_amperage: number | null;
  @Column({ type: 'int', nullable: true }) max_electric_power: number | null;
  @Column({ type: 'json', nullable: true }) tariff_ids: unknown;
  @Column({ type: 'varchar', length: 255, nullable: true }) terms_and_conditions: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) last_updated: string | null;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => OcpiCpoEvse, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'evseId' })
  evse: OcpiCpoEvse;
}
