import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { Staff } from '../../../clients/src/entities/staff.entity';
import { Vendor } from './vendor.entity';
import { VendorUser } from './vendor-user.entity';
import { Tariff } from '../../../tariffs/src/entities/tariff.entity';

@Entity('user_types')
@Index(['clientId'])
@Index(['vendorId'])
export class UserType {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 255, nullable: true }) name: string | null;
  @Column({ type: 'datetime', nullable: true }) startDate: Date | null;
  @Column({ type: 'datetime', nullable: true }) endDate: Date | null;
  @Column({ type: 'int', nullable: true }) vendorId: number | null;
  @Column() clientId: number;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'clientId' })
  client: Staff;

  @ManyToOne(() => Vendor)
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor | null;

  @OneToMany(() => VendorUser, (vu) => vu.userType)
  vendorUsers: VendorUser[];

  @OneToMany(() => Tariff, (t) => t.userType)
  tariffs?: Tariff[];
}
