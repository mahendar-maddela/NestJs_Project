import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Vendor } from './vendor.entity';

@Entity('vendorplatforms')
export class VendorPlatform {
  @PrimaryGeneratedColumn() id: number;
  @Column() vendorId: number;
  @Column() platformId: number;
  @Column({ type: 'varchar', length: 255, default: 'Vendor' }) type: string;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => Vendor)
  @JoinColumn({ name: 'vendorId' })
  vendor?: Vendor;
}
