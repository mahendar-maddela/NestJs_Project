import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { Staff } from './staff.entity';

@Entity('clientdetails')
export class ClientDetails {
  @PrimaryGeneratedColumn() id: number;
  @Column({ unique: true }) clientId: number;
  @Column({ type: 'varchar', length: 255, nullable: true }) companyName: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) contactEmail: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) contactPhone: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) gst: string | null;
  @Column({ type: 'text', nullable: true }) address: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) businessUrl: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) brandName: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) logoUrl: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) primaryColor: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) csmsUrl: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) cpoUrl: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) fleetUrl: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) clientType: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) userPortalUrl: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) termsAndConditionsUrl: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) privacyPolicyUrl: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) refundPolicyUrl: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) supportUrl: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) shippingPolicyUrl: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) mobileAppDeepLinkUrl: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) state: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) country: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) zipCode: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) partyId: string | null;
  @Column({ type: 'float', default: 0 }) preConvDeductionAmount: number;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @OneToOne(() => Staff, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clientId' })
  client: Staff;
}
