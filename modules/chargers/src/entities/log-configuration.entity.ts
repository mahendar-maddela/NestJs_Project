import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('logconfigurations')
export class LogConfiguration {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'int', nullable: true }) chargerRef: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) chargerId: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) key: string | null;
  @Column({ type: 'tinyint', nullable: true }) storeValue: number | null;
  @Column({ type: 'tinyint', nullable: true }) displayValue: number | null;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;
}
