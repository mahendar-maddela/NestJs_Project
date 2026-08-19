import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Vendor } from './vendor.entity';
import { Staff } from '../../../clients/src/entities/staff.entity';

@Entity('addresses')
export class Address {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 255, nullable: true }) address: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) city: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) state: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) country: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) pincode: string | null;
  @Column({ type: 'int', nullable: true, unique: true }) vendorId: number | null;
  @Column({ type: 'int', nullable: true }) clientId: number | null;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => Vendor)
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor | null;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'clientId' })
  client?: Staff | null;
}
