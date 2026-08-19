import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Staff } from './staff.entity';

@Entity('logintracks')
@Index(['clientId'])
@Index(['staffId'])
export class LoginTrack {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'int', nullable: true }) staffId: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) ipAddress: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) device: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) browser: string | null;
  @Column({ type: 'datetime', nullable: true }) loginTime: Date | null;
  @Column({ type: 'datetime', nullable: true }) logoutTime: Date | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) status: string | null;
  @Column() clientId: number;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'staffId' })
  staff: Staff | null;
}
