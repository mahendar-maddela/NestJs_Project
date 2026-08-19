import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('logs')
@Index(['chargerId', 'createdAt'])
export class Logs {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 255, nullable: true }) timestamp: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) logType: string | null;
  @Column({ type: 'text', nullable: true }) log: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) chargerId: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) from: string | null;
  @Column({ type: 'boolean', default: false }) error: boolean;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;
}
