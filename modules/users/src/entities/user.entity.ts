import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index, OneToOne } from 'typeorm';
import { UserStatus } from 'database/src/enums';
import { Staff } from '../../../clients/src/entities/staff.entity';
import { VendorUser } from '../../../vendors/src/entities/vendor-user.entity';
import { Wallet } from '../../../wallet/src/entities/wallet.entity';
import { Vehicle } from './vehicle.entity';
import { DeviceTransaction } from '../../../sessions/src/entities/device-transaction.entity';
import { ChargingSession } from '../../../sessions/src/entities/charging-session.entity';
import { PaymentTransaction } from '../../../payments/src/entities/payment-transaction.entity';
import { RfidTag } from '../../../fleet/src/entities/rfid-tag.entity';
import { StationFavourite } from '../../../stations/src/entities/station-favourite.entity';
import { CouponUser } from './coupon-user.entity';

@Entity('users')
@Index(['clientId'])
@Index(['phone'])
@Index(['email'])
export class User {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 255, nullable: true }) first_name: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) last_name: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) email: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) phone: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) pan: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) gst: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) userId: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) fcmToken: string | null;
  @Column({ type: 'enum', enum: UserStatus, default: 'Active' }) status: UserStatus;
  @Column({ type: 'boolean', default: false }) isFirstLogin: boolean;
  @Column() clientId: number;
  @Column({ type: 'varchar', length: 255, nullable: true }) appName: string | null;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;
  @Column({ type: 'datetime', nullable: true }) deletedAt: Date | null;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'clientId' })
  client: Staff;

  @OneToOne(() => Wallet, (wallet) => wallet.user)
  wallet?: Wallet;

  @OneToMany(() => VendorUser, (vu) => vu.user)
  vendorUsers?: VendorUser[];

  @OneToMany(() => Vehicle, (v) => v.user)
  vehicles?: Vehicle[];

  @OneToMany(() => DeviceTransaction, (dt) => dt.user)
  deviceTransactions?: DeviceTransaction[];

  @OneToMany(() => ChargingSession, (cs) => cs.user)
  chargingSessions?: ChargingSession[];

  @OneToMany(() => PaymentTransaction, (pt) => pt.user)
  paymentTransactions?: PaymentTransaction[];

  @OneToMany(() => RfidTag, (rt) => rt.user)
  rfidTags?: RfidTag[];

  @OneToMany(() => StationFavourite, (sf) => sf.user)
  stationFavourites?: StationFavourite[];

  @OneToMany(() => CouponUser, (cu) => cu.user)
  couponUsers?: CouponUser[];
}
