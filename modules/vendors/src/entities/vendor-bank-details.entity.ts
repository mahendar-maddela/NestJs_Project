import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { Vendor } from './vendor.entity';

@Entity('vendorbankdetails')
export class VendorBankDetails {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 255, nullable: true }) bankName: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) accountHolderName: string | null;
  @Column({ type: 'bigint', nullable: true, transformer: { to: (v) => v, from: (v) => (v === null ? null : Number(v)) } })
  accountNumber: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) branchName: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) ifsCode: string | null;
  @Column({ unique: true }) vendorId: number;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @OneToOne(() => Vendor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor;
}
