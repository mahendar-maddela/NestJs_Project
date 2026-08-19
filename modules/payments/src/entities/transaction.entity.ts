import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { PaymentStatus } from 'database/src/enums';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 255, nullable: true }) amount: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) paymentId: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) mode: string | null;
  @Column({ type: 'datetime', nullable: true }) date: Date | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) time: string | null;
  @Column({ type: 'enum', enum: PaymentStatus, default: 'Pending' }) status: PaymentStatus;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;
}
