import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Staff } from '../../../clients/src/entities/staff.entity';
import { Vendor } from '../../../vendors/src/entities/vendor.entity';
import { Charger } from '../../../chargers/src/entities/charger.entity';

@Entity('cpoamcs')
@Index(['clientId'])
@Index(['vendorId'])
@Index(['chargerId'])
export class CpoAmc {
  @PrimaryGeneratedColumn() id: number;
  @Column() chargerId: number;
  @Column() vendorId: number;
  @Column({ type: 'datetime', nullable: true }) startDate: Date | null;
  @Column({ type: 'datetime', nullable: true }) endDate: Date | null;
  @Column({ type: 'decimal', precision: 20, scale: 4, nullable: true }) amount: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) status: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) chargeType: string | null;
  @Column({ type: 'datetime', nullable: true }) paidDate: Date | null;
  @Column({ type: 'datetime', nullable: true }) renewDate: Date | null;
  @Column({ type: 'boolean', default: false }) renew: boolean;
  @Column() clientId: number;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'clientId' })
  client: Staff;

  @ManyToOne(() => Charger)
  @JoinColumn({ name: 'chargerId' })
  charger: Charger;

  @ManyToOne(() => Vendor)
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor;
}
