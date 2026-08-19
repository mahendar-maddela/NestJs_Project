import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { OcpiCpo } from './ocpi-cpo.entity';
import { OcpiCpoTransaction } from './ocpi-cpo-transaction.entity';
import { OcpiCpoEvse } from './ocpi-cpo-evse.entity';
import { User } from '../../../users/src/entities/user.entity';

@Entity('ocpicposessions')
@Index(['cpo_id'])
@Index(['sessionId'])
export class OcpiCpoSession {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'int', nullable: true }) cpo_id: number | null;
  @Column({ name: 'session_id', type: 'char', length: 36 }) sessionId: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) status: string | null;
  @Column({ type: 'int', nullable: true }) user_id: number | null;
  @Column({ type: 'int', nullable: true }) evse_id: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) evse_uid: string | null;
  @Column({ type: 'float', nullable: true }) max_amount: number | null;
  @Column({ type: 'float', nullable: true }) max_energy: number | null;
  @Column({ type: 'float', nullable: true }) total_kwh: number | null;
  @Column({ type: 'float', nullable: true }) total_amount: number | null;
  @Column({ type: 'float', nullable: true }) price: number | null;
  @Column({ type: 'float', nullable: true }) tax: number | null;
  @Column({ type: 'int', nullable: true }) timeout: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) reason: string | null;
  @Column({ type: 'datetime', nullable: true }) start_date: Date | null;
  @Column({ type: 'datetime', nullable: true }) end_date: Date | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) last_updated: string | null;
  @Column({ type: 'int', nullable: true }) transactionId: number | null;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => OcpiCpo)
  @JoinColumn({ name: 'cpo_id' })
  cpo: OcpiCpo | null;

  @ManyToOne(() => OcpiCpoTransaction, (transaction) => transaction.session)
  @JoinColumn({ name: 'transactionId' })
  transaction: OcpiCpoTransaction | null;

  @ManyToOne(() => OcpiCpoEvse)
  @JoinColumn({ name: 'evse_id' })
  evse: OcpiCpoEvse | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User | null;
}
