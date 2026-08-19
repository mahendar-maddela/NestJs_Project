import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToOne, JoinColumn, Index } from 'typeorm';
import { WalletType, WalletStatus } from 'database/src/enums';
import { Staff } from '../../../clients/src/entities/staff.entity';
import { User } from '../../../users/src/entities/user.entity';
import { Vendor } from '../../../vendors/src/entities/vendor.entity';
import { FleetUserDetail } from '../../../fleet/src/entities/fleet-user-detail.entity';

@Entity('wallets')
@Index(['clientId'])
@Index(['userId'])
@Index(['vendorId'])
@Index(['fleetId'])
export class Wallet {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'int', nullable: true }) userId: number | null;
  @Column({ type: 'int', nullable: true }) vendorId: number | null;
  @Column({ type: 'int', nullable: true }) fleetId: number | null;
  @Column({ type: 'float', nullable: true, default: 0 }) balance: number | null;
  @Column({ type: 'enum', enum: WalletType, nullable: true }) type: WalletType | null;
  @Column({ type: 'enum', enum: WalletStatus, default: 'Active' }) status: WalletStatus;
  @Column() clientId: number;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'clientId' })
  client: Staff;

  @OneToOne(() => User, (user) => user.wallet)
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @ManyToOne(() => Vendor)
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor | null;

  @ManyToOne(() => FleetUserDetail)
  @JoinColumn({ name: 'fleetId' })
  fleetUserDetail: FleetUserDetail | null;
}
