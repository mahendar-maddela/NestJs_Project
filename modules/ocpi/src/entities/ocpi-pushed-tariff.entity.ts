import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { OcpiEmsp } from './ocpi-emsp.entity';
import { RoamingTariff } from './roaming-tariff.entity';
import { Tariff } from '../../../tariffs/src/entities/tariff.entity';

@Entity('ocpipushedtariffs')
@Index(['emspId'])
@Index(['roamingTariffId'])
export class OcpiPushedTariff {
  @PrimaryGeneratedColumn() id: number;
  @Column() emspId: number;
  @Column({ type: 'int', nullable: true }) tariffId: number | null;
  @Column({ type: 'int', nullable: true }) roamingTariffId: number | null;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  // this.belongsTo(models.OcpieMSP, { foreignKey: "emspId", as: "emsp" });
  @ManyToOne(() => OcpiEmsp)
  @JoinColumn({ name: 'emspId' })
  emsp: OcpiEmsp;

  // this.belongsTo(models.Tariff, { foreignKey: "tariffId", as: "tariff" });
  @ManyToOne(() => Tariff)
  @JoinColumn({ name: 'tariffId' })
  tariff: Tariff | null;

  // this.belongsTo(models.RoamingTariff, { foreignKey: "roamingTariffId", as: "roamingTariff", });
  @ManyToOne(() => RoamingTariff, (rt) => rt.pushedTariffs)
  @JoinColumn({ name: 'roamingTariffId' })
  roamingTariff: RoamingTariff | null;
}
