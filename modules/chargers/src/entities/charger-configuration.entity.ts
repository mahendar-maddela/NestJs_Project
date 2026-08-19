import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Charger } from './charger.entity';

@Entity('chargerconfigurations')
@Index(['chargerRef'])
export class ChargerConfiguration {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 255, nullable: true }) chargerId: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) configName: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) configValue: string | null;
  @Column({ type: 'text', nullable: true }) configDescription: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) accessibility: string | null;
  @Column() chargerRef: number;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => Charger)
  @JoinColumn({ name: 'chargerRef' })
  charger: Charger;
}
