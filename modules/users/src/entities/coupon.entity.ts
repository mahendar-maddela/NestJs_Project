import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { CouponStatus } from 'database/src/enums';
import { Staff } from '../../../clients/src/entities/staff.entity';

@Entity('coupons')
@Index(['clientId'])
@Index(['code'])
export class Coupon {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'datetime', nullable: true }) startDate: Date | null;
  @Column({ type: 'datetime', nullable: true }) endDate: Date | null;
  @Column({ type: 'float', nullable: true }) amount: number | null;
  @Column({ type: 'varchar', length: 255 }) code: string;
  @Column({ type: 'float', nullable: true }) cashbackPercent: number | null;
  @Column({ type: 'int', nullable: true }) staffId: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) note: string | null;
  @Column({ type: 'float', nullable: true }) maxCashbackAmount: number | null;
  @Column({ type: 'enum', enum: CouponStatus, default: 'Active' }) status: CouponStatus;
  @Column() clientId: number;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'clientId' })
  client: Staff;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'staffId' })
  staff: Staff | null;
}
