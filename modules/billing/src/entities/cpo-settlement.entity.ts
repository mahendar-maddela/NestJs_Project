import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Staff } from '../../../clients/src/entities/staff.entity';
import { Vendor } from '../../../vendors/src/entities/vendor.entity';
import { Charger } from '../../../chargers/src/entities/charger.entity';

@Entity('cposettlements')
@Index(['clientId'])
@Index(['vendorId'])
export class CpoSettlement {
  @PrimaryGeneratedColumn() id: number;
  @Column() chargerId: number;
  @Column() vendorId: number;
  @Column({ type: 'datetime', nullable: true }) fromDate: Date | null;
  @Column({ type: 'datetime', nullable: true }) toDate: Date | null;
  @Column({ type: 'decimal', precision: 20, scale: 4, nullable: true }) platformFee: string | null;
  @Column({ type: 'decimal', precision: 20, scale: 4, nullable: true }) extraFee: string | null;
  @Column({ type: 'decimal', precision: 20, scale: 4, nullable: true }) totalAmount: string | null;
  @Column({ type: 'datetime', nullable: true }) settledDate: Date | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) status: string | null;
  @Column({ type: 'decimal', precision: 20, scale: 4, nullable: true }) netPayble: string | null;
  @Column({ type: 'decimal', precision: 20, scale: 4, nullable: true }) transactionFee: string | null;
  @Column({ type: 'decimal', precision: 20, scale: 4, nullable: true }) paidAmount: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) refNo: string | null;
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
