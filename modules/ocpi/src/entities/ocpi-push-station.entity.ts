import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Station } from '../../../stations/src/entities/station.entity';
import { Charger } from '../../../chargers/src/entities/charger.entity';
import { OcpiEmsp } from './ocpi-emsp.entity';

@Entity('ocpipushstations')
@Index(['emspId'])
@Index(['chargerId'])
@Index(['stationId'])
export class OcpiPushStation {
  @PrimaryGeneratedColumn() id: number;
  @Column() emspId: number;
  @Column() stationId: number;
  @Column() chargerId: number;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => OcpiEmsp)
  @JoinColumn({ name: 'emspId' })
  emsp: OcpiEmsp;

  @ManyToOne(() => Charger)
  @JoinColumn({ name: 'chargerId' })
  charger: Charger;

  @ManyToOne(() => Station)
  @JoinColumn({ name: 'stationId' })
  station: Station;
}
