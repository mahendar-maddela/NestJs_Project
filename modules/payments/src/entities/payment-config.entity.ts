import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToOne, JoinColumn } from 'typeorm';
import { Staff } from '../../../clients/src/entities/staff.entity';

@Entity('paymentconfigs')
@Index(['clientId'])
export class PaymentConfig {
  @PrimaryGeneratedColumn() id: number;
  @Column() clientId: number;
  @Column({ type: 'varchar', length: 255, nullable: true }) provider: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) keyId: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) secretToken: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) webhookSecret: string | null;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @OneToOne(() => Staff, (staff) => staff.paymentConfig)
  @JoinColumn({ name: 'clientId' })
  client?: Staff;
}
