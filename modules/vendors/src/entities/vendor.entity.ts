import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToOne, OneToMany, ManyToMany, JoinTable, JoinColumn, Index } from 'typeorm';
import { VendorStatus } from 'database/src/enums';
import { Staff } from '../../../clients/src/entities/staff.entity';
import { VendorBankDetails } from './vendor-bank-details.entity';
import { UserType } from './user-type.entity';
import { Station } from '../../../stations/src/entities/station.entity';
import { Charger } from '../../../chargers/src/entities/charger.entity';
import { Role } from '../../../clients/src/entities/role.entity';
import { Tariff } from '../../../tariffs/src/entities/tariff.entity';
import { VendorUser } from './vendor-user.entity';
import { VendorPlatform } from './vendor-platform.entity';
import { Address } from './address.entity';
import { CpoAmc } from '../../../billing/src/entities/cpo-amc.entity';
import { CpoSettlement } from '../../../billing/src/entities/cpo-settlement.entity';
import { VendorType } from './vendor-type.entity';
import { Feature } from './feature.entity';
import { Wallet } from '../../../wallet/src/entities/wallet.entity';
import { RfidTag } from '../../../fleet/src/entities/rfid-tag.entity';
import { FleetUserDetail } from '../../../fleet/src/entities/fleet-user-detail.entity';
import { FleetVehicleGroup } from '../../../fleet/src/entities/fleet-vehicle-group.entity';
import { Permission } from '../../../clients/src/entities/permission.entity';

@Entity('vendors')
@Index(['clientId'])
export class Vendor {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 255, nullable: true }) vendor_name: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) community_name: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) phone: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) email: string | null;
  @Column({ type: 'int', nullable: true }) vendorTypeId: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) vendorUniqueId: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) pan: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) gst: string | null;
  @Column({ type: 'int', nullable: true }) noOfStations: number | null;
  @Column({ type: 'int', nullable: true }) noOfEmployees: number | null;
  @Column({ type: 'int', nullable: true }) noOfUsers: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) password: string | null;
  @Column({ type: 'int', nullable: true }) staffId: number | null;
  @Column({ type: 'boolean', nullable: true, default: false }) isTemp: boolean | null;
  @Column({ type: 'enum', enum: VendorStatus, default: 'Active' }) status: VendorStatus;
  @Column({ type: 'int', nullable: true }) parentVendorId: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) transFeePerc: string | null;
  @Column({ type: 'boolean', default: false }) twoFaEnabled: boolean;
  @Column({ type: 'varchar', length: 255, nullable: true }) location: string | null;
  @Column() clientId: number;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'clientId' })
  client: Staff;

  @ManyToOne(() => Vendor)
  @JoinColumn({ name: 'parentVendorId' })
  parentVendor: Vendor | null;

  @OneToOne(() => VendorBankDetails, (vbd) => vbd.vendor)
  vendorBankDetails?: VendorBankDetails;

  @OneToMany(() => Station, (s) => s.vendor)
  stations?: Station[];

  @OneToMany(() => Charger, (c) => c.vendor)
  chargers?: Charger[];

  @OneToMany(() => Vendor, (v) => v.parentVendor)
  subVendors?: Vendor[];

  @OneToMany(() => Role, (r) => r.vendor)
  roles?: Role[];

  @OneToMany(() => UserType, (ut) => ut.vendor)
  userTypes?: UserType[];

  @OneToMany(() => Tariff, (t) => t.vendor)
  tariffs?: Tariff[];

  @OneToMany(() => VendorUser, (vu) => vu.vendor)
  vendorUsers?: VendorUser[];

  @OneToMany(() => VendorPlatform, (vp) => vp.vendor)
  vendorPlatforms?: VendorPlatform[];

  @OneToMany(() => Address, (a) => a.vendor)
  addresses?: Address[];

  @OneToMany(() => CpoAmc, (ca) => ca.vendor)
  cpoAmcs?: CpoAmc[];

  @OneToMany(() => CpoSettlement, (cs) => cs.vendor)
  cpoSettlements?: CpoSettlement[];

  @ManyToOne(() => VendorType)
  @JoinColumn({ name: 'vendorTypeId' })
  vendorType?: VendorType | null;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'staffId' })
  staff?: Staff | null;

  @ManyToMany(() => Feature)
  @JoinTable({
    name: 'featurepermissions',
    joinColumn: { name: 'vendorId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'featureId', referencedColumnName: 'id' },
  })
  feature?: Feature[];

  @ManyToMany(() => Feature)
  @JoinTable({
    name: 'featurepermissions',
    joinColumn: { name: 'vendorId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'featureId', referencedColumnName: 'id' },
  })
  features?: Feature[];

  @OneToMany(() => Wallet, (w) => w.vendor)
  wallet?: Wallet[];

  @OneToMany(() => RfidTag, (rt) => rt.vendor)
  rfidtags?: RfidTag[];

  @ManyToMany(() => Permission)
  @JoinTable({
    name: 'individualpermissions',
    joinColumn: { name: 'vendorId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permissionId', referencedColumnName: 'id' },
  })
  permissions?: Permission[];

  @OneToMany(() => FleetUserDetail, (fud) => fud.vendor)
  fleetUserDetails?: FleetUserDetail[];

  @OneToMany(() => FleetVehicleGroup, (fvg) => fvg.vendor)
  groups?: FleetVehicleGroup[];
}
