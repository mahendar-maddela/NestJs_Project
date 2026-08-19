import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ClientChargerAmcStatus } from 'database/src/enums';
import { Staff } from '../../../clients/src/entities/staff.entity';
import { Charger } from '../../../chargers/src/entities/charger.entity';

@Entity('clientchargeramcs')
@Index(['clientId'])
@Index(['chargerId'])
export class ClientChargerAmc {
  @PrimaryGeneratedColumn() id: number;
  @Column() clientId: number;
  @Column() chargerId: number;
  @Column({ type: 'datetime', nullable: true }) startDate: Date | null;
  @Column({ type: 'datetime', nullable: true }) endDate: Date | null;
  @Column({ type: 'enum', enum: ClientChargerAmcStatus, nullable: true }) status: ClientChargerAmcStatus | null;
  @Column({ type: 'decimal', precision: 20, scale: 4, nullable: true }) paid_amount: string | null;
  @Column({ type: 'decimal', precision: 20, scale: 4, nullable: true }) amount_per_annum: string | null;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'clientId' })
  client: Staff;

  @ManyToOne(() => Charger)
  @JoinColumn({ name: 'chargerId' })
  charger: Charger;
}
