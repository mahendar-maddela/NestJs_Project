import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { InternalRoamingStatus } from 'database/src/enums';
import { Charger } from '../../../chargers/src/entities/charger.entity';
import { Staff } from '../../../clients/src/entities/staff.entity';
import { RoamingClient } from './roaming-client.entity';

@Entity('internalroamings')
@Index(['exportClientId'])
@Index(['importClientId'])
export class InternalRoaming {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'int', nullable: true }) roamingId: number | null;
  @Column() chargerId: number;
  @Column() exportClientId: number;
  @Column() importClientId: number;
  @Column({ type: 'enum', enum: InternalRoamingStatus, default: 'ACTIVE' }) status: InternalRoamingStatus;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => Charger)
  @JoinColumn({ name: 'chargerId' })
  charger: Charger;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'exportClientId' })
  exportClient: Staff;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'importClientId' })
  importClient: Staff;

  @ManyToOne(() => RoamingClient, (rc) => rc.roamingChargers)
  @JoinColumn({ name: 'roamingId' })
  roamingClient: RoamingClient | null;
}
