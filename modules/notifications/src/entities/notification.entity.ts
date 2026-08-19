import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Staff } from '../../../clients/src/entities/staff.entity';

@Entity('notifications')
@Index(['clientId'])
export class Notification {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 255, nullable: true }) type: string | null;
  @Column({ type: 'text', nullable: true }) message: string | null;
  @Column({ type: 'int', nullable: true }) staffId: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) title: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) reason: string | null;
  @Column() clientId: number;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'clientId' })
  client: Staff;
}
