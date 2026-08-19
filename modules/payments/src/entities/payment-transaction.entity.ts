import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { PaymentActorType, PaymentStatus, TransactionDirection, PaymentProvider, PaymentPurpose } from 'database/src/enums';
import { User } from '../../../users/src/entities/user.entity';
import { FleetUserDetail } from '../../../fleet/src/entities/fleet-user-detail.entity';
import { Wallet } from '../../../wallet/src/entities/wallet.entity';
import { Staff } from '../../../clients/src/entities/staff.entity';

@Entity('paymenttransactions')
@Index(['clientId'])
@Index(['fleetId'])
@Index(['orderId'])
@Index(['paymentId'])
@Index(['userId'])
export class PaymentTransaction {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'int', nullable: true }) userId: number | null;
  @Column({ type: 'float' }) amount: number;
  @Column({ type: 'varchar', length: 255, nullable: true }) paymentType: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) orderId: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) paymentId: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) currency: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) description: string | null;
  @Column({ type: 'int', nullable: true }) walletId: number | null;
  @Column({ type: 'int', nullable: true }) couponId: number | null;
  @Column({ type: 'enum', enum: PaymentActorType, nullable: true }) type: PaymentActorType | null;
  @Column({ type: 'enum', enum: PaymentStatus, default: 'Pending' }) status: PaymentStatus;
  @Column({ type: 'enum', enum: TransactionDirection, nullable: true }) transactionType: TransactionDirection | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) utr: string | null;
  @Column({ type: 'int', nullable: true }) fleetId: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) hook: string | null;
  @Column() clientId: number;
  @Column({ type: 'json', nullable: true }) webhook: Record<string, unknown> | null;
  @Column({ type: 'enum', enum: PaymentProvider, default: 'Razorpay' }) provider: PaymentProvider;
  @Column({ type: 'enum', enum: PaymentPurpose, default: 'WalletRecharge' }) paymentPurpose: PaymentPurpose;
  @Column({ type: 'varchar', length: 255, nullable: true }) providerQrId: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) paidUser: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) paidUserEmail: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) refundId: string | null;
  @Column({ type: 'float', nullable: true }) refundAmount: number | null;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => User, (u) => u.paymentTransactions)
  @JoinColumn({ name: 'userId' })
  user?: User;

  @ManyToOne(() => FleetUserDetail)
  @JoinColumn({ name: 'fleetId' })
  fleetUserDetail?: FleetUserDetail;

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: 'walletId' })
  wallet?: Wallet;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'clientId' })
  client?: Staff;
}
