import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { QrCodeStatus } from 'database/src/enums';

@Entity('paychargeqrcodes')
@Index(['clientId'])
@Index(['chargerId', 'connectorId'])
export class PayChargeQRCode {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 255, nullable: true }) qrProvider: string | null;
  @Column() clientId: number;
  @Column() chargerId: number;
  @Column() connectorId: number;
  @Column({ type: 'text', nullable: true }) qrProviderId: string | null;
  @Column({ type: 'enum', enum: QrCodeStatus, default: 'ACTIVE' }) status: QrCodeStatus;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;
}
