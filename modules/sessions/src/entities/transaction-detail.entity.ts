import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { DeviceTransaction } from './device-transaction.entity';

@Entity('transactiondetails')
@Index(['transactionRef'])
export class TransactionDetail {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 255, nullable: true }) chargerId: string | null;
  @Column({ type: 'bigint', nullable: true, transformer: { to: (v) => v, from: (v) => (v === null ? null : Number(v)) } })
  transactionId: number | null;
  @Column({ type: 'float', nullable: true }) temperature: number | null;
  @Column({ type: 'float', nullable: true }) voltage: number | null;
  @Column({ type: 'float', nullable: true }) voltageEv: number | null;
  @Column({ type: 'float', nullable: true }) batteryPercentage: number | null;
  @Column({ type: 'float', nullable: true }) currentImport: number | null;
  @Column({ type: 'float', nullable: true }) currentImportEv: number | null;
  @Column({ type: 'float', nullable: true }) currentOffered: number | null;
  @Column({ type: 'float', nullable: true }) powerOffered: number | null;
  @Column({ type: 'float', nullable: true }) meterValue: number | null;
  @Column({ type: 'int', nullable: true }) transactionRef: number | null;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => DeviceTransaction)
  @JoinColumn({ name: 'transactionRef' })
  transaction: DeviceTransaction | null;
}
