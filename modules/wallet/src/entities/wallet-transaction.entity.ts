import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { WalletType, WalletTxDirection, WalletSourceType, WalletTxPurpose } from 'database/src/enums';
import { Staff } from '../../../clients/src/entities/staff.entity';
import { PaymentTransaction } from '../../../payments/src/entities/payment-transaction.entity';
import { DeviceTransaction } from '../../../sessions/src/entities/device-transaction.entity';
import { Wallet } from './wallet.entity';

@Entity('wallettransactions')
@Index(['clientId'])
@Index(['walletId'])
@Index(['refNo'])
export class WalletTransaction {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 255, nullable: true }) refNo: string | null;
  @Column({ type: 'int', nullable: true }) walletId: number | null;
  @Column({ type: 'int', nullable: true }) creditsId: number | null;
  @Column({ type: 'float', nullable: true }) amount: number | null;
  @Column({ type: 'int', nullable: true }) chargerId: number | null;
  @Column({ type: 'enum', enum: WalletTxDirection, nullable: true }) type: WalletTxDirection | null;
  @Column({ type: 'float', nullable: true }) remainingBalance: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) note: string | null;
  @Column({ type: 'enum', enum: WalletType, nullable: true }) userType: WalletType | null;
  @Column({ type: 'enum', enum: WalletSourceType, nullable: true }) sourceType: WalletSourceType | null;
  @Column({ type: 'enum', enum: WalletTxPurpose, nullable: true }) transactionPurpose: WalletTxPurpose | null;
  @Column({ type: 'int', nullable: true }) transactionRef: number | null;
  @Column({ type: 'int', nullable: true }) paymentTransactionId: number | null;
  @Column({ type: 'int', nullable: true }) staffId: number | null;
  @Column() clientId: number;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'clientId' })
  client: Staff;

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: 'walletId' })
  wallet: Wallet | null;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'staffId' })
  staff: Staff | null;

  @ManyToOne(() => PaymentTransaction)
  @JoinColumn({ name: 'paymentTransactionId' })
  paymentTransaction: PaymentTransaction | null;

  @ManyToOne(() => DeviceTransaction)
  @JoinColumn({ name: 'transactionRef' })
  transaction: DeviceTransaction | null;
}
