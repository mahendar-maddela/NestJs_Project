import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('clientsupportassignments')
export class ClientSupportAssignment {
  @PrimaryColumn() clientSupportId: number;
  @PrimaryColumn() superAdminId: number;
  @Column({ type: 'float', nullable: true }) workedHours: number | null;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;
}
