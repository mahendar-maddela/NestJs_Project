import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('monthlyanalytics')
@Index(['clientId'])
export class MonthlyAnalytics {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'int', nullable: true }) year: number | null;
  @Column({ type: 'int', nullable: true }) month: number | null;
  @Column({ type: 'int', nullable: true }) vendorId: number | null;
  @Column({ type: 'int', nullable: true }) stationId: number | null;
  @Column({ type: 'int', nullable: true }) chargerId: number | null;
  @Column({ type: 'int', nullable: true }) fleetId: number | null;
  @Column({ type: 'float', nullable: true }) revenue: number | null;
  @Column({ type: 'float', nullable: true }) consumption: number | null;
  @Column({ type: 'int', nullable: true }) transactionCount: number | null;
  @Column() clientId: number;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;
}
