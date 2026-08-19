import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { Charger } from '../../../chargers/src/entities/charger.entity';
import { OcpiPushedTariff } from './ocpi-pushed-tariff.entity';

@Entity('roamingtariffs')
@Index(['clientId'])
@Index(['importClientId'])
export class RoamingTariff {
  @PrimaryGeneratedColumn() id: number;
  @Column() chargerId: number;
  @Column({ type: 'int', nullable: true }) vendorId: number | null;
  @Column({ type: 'float', nullable: true }) price: number | null;
  @Column({ type: 'float', nullable: true }) gst: number | null;
  @Column() clientId: number;
  @Column({ type: 'int', nullable: true }) importClientId: number | null;
  @Column({ type: 'int', nullable: true }) emspId: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) tariffType: string | null;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => Charger)
  @JoinColumn({ name: 'chargerId' })
  charger: Charger;

  @OneToMany(() => OcpiPushedTariff, (pushed) => pushed.roamingTariff)
  pushedTariffs: OcpiPushedTariff[];
}
