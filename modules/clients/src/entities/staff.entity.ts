import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, OneToOne, ManyToOne, ManyToMany, JoinTable, JoinColumn } from 'typeorm';
import { StaffStatus } from 'database/src/enums';
import { ClientDetails } from './client-details.entity';
import { IndividualPermission } from './individual-permission.entity';
import { LoginTrack } from './login-track.entity';
import { StaffRole } from './staff-role.entity';
import { User } from '../../../users/src/entities/user.entity';
import { Vendor } from '../../../vendors/src/entities/vendor.entity';
import { Charger } from '../../../chargers/src/entities/charger.entity';
import { Station } from '../../../stations/src/entities/station.entity';
import { Tariff } from '../../../tariffs/src/entities/tariff.entity';
import { PrefixConfig } from './prefix-config.entity';
import { CredentialConfig } from './credential-config.entity';
import { SuperAdmin } from '../../../super-admin/src/entities/super-admin.entity';
import { ClientAmc } from '../../../billing/src/entities/client-amc.entity';
import { Otp } from '../../../auth/src/entities/otp.entity';
import { PaymentConfig } from '../../../payments/src/entities/payment-config.entity';
import { ClientFeature } from './client-feature.entity';
import { Address } from '../../../vendors/src/entities/address.entity';

@Entity('staffs')
export class Staff {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 255, nullable: true }) first_name: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) last_name: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) empId: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) aadhar: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) pan: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) email: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) phone: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) password: string | null;
  @Column({ type: 'boolean', nullable: true, default: false }) isTemp: boolean | null;
  @Column({ type: 'enum', enum: StaffStatus, default: 'Active' }) status: StaffStatus;
  @Column() clientId: number;
  @Column({ type: 'varchar', length: 255, nullable: true }) clientToken: string | null;
  @Column({ type: 'int', nullable: true }) superAdminId: number | null;
  @Column({ type: 'int', nullable: true }) assignedEmployee: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) clientContactEmail: string | null;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => SuperAdmin)
  @JoinColumn({ name: 'assignedEmployee' })
  assigned?: SuperAdmin | null;

  @OneToOne(() => ClientDetails, (clientDetails) => clientDetails.client)
  clientDetails?: ClientDetails;

  @OneToMany(() => IndividualPermission, (ip) => ip.staff)
  individualPermissions?: IndividualPermission[];

  @OneToMany(() => LoginTrack, (lt) => lt.staff)
  loginTracks?: LoginTrack[];

  @OneToMany(() => StaffRole, (sr) => sr.staff)
  staffRoles?: StaffRole[];

  @OneToMany(() => User, (u) => u.client)
  users?: User[];

  @OneToMany(() => Vendor, (v) => v.client)
  vendors?: Vendor[];

  @OneToMany(() => Charger, (c) => c.client)
  chargers?: Charger[];

  @OneToMany(() => Station, (s) => s.client)
  stations?: Station[];

  @OneToOne(() => PrefixConfig, (pc) => pc.client)
  prefixConfig?: PrefixConfig;

  @OneToOne(() => CredentialConfig, (cc) => cc.client)
  credentialConfig?: CredentialConfig;

  @OneToMany(() => ClientAmc, (amc) => amc.client)
  clientAmcs?: ClientAmc[];

  // ---- Added missing Sequelize-parity relationships ----

  @OneToMany(() => Otp, (otp) => otp.staff)
  otps?: Otp[];

  @OneToOne(() => PaymentConfig, (pc) => pc.client)
  paymentConfig?: PaymentConfig;

  @OneToMany('Vendor', 'staff')
  vendor?: any[];

  @ManyToMany('Role')
  @JoinTable({
    name: 'staff_roles',
    joinColumn: { name: 'staffId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'roleId', referencedColumnName: 'id' },
  })
  roles?: any[];

  @OneToMany('Role', 'staff')
  createdRoles?: any[];

  @OneToMany('WalletTransaction', 'staff')
  walletTransaction?: any[];

  @OneToMany('Station', 'createdStaff')
  createdStations?: any[];

  @OneToMany('Charger', 'staff')
  createdChargers?: any[];

  @ManyToMany('Permission')
  @JoinTable({
    name: 'individualpermissions',
    joinColumn: { name: 'staffId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permissionId', referencedColumnName: 'id' },
  })
  permissions?: any[];

  @OneToMany('Notification', 'staff')
  notifications?: any[];

  @OneToMany('Coupon', 'staff')
  coupons?: any[];

  @OneToMany('RfidTag', 'staff')
  rfidTags?: any[];

  @OneToMany('Tariff', 'staff')
  tariffs?: any[];

  @OneToMany('FleetUserDetail', 'staff')
  fleetUserDetails?: any[];

  @OneToMany('FleetVehicleGroup', 'staff')
  fleetVehicleGroups?: any[];

  @ManyToOne('SuperAdmin')
  @JoinColumn({ name: 'superAdminId' })
  superAdmin?: any;

  @OneToMany('Staff', 'client')
  staffs?: any[];

  @ManyToOne('Staff')
  @JoinColumn({ name: 'clientId' })
  client?: any;

  @OneToMany('LoginTrack', 'client')
  clientLoginTracks?: any[];

  @ManyToMany(() => ClientFeature, (feature) => feature.clients)
  @JoinTable({
    name: 'clientfeaturemappings',
    joinColumn: { name: 'clientId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'featureId', referencedColumnName: 'id' },
  })
  features?: ClientFeature[];

  @OneToMany('Role', 'client')
  clientRoles?: any[];

  @OneToMany('CpoAmc', 'client')
  cpoAmcs?: any[];

  @OneToMany('PaymentTransaction', 'client')
  paymentTransactions?: any[];

  @OneToMany('Vehicle', 'client')
  vehicles?: any[];

  @OneToMany('Coupon', 'client')
  clientCoupons?: any[];

  @OneToMany('Notification', 'client')
  clientNotifications?: any[];

  @OneToMany('CpoSettlement', 'client')
  clientCpoSettlements?: any[];

  @OneToMany('FleetUserDetail', 'client')
  fleet?: any[];

  @OneToMany('FleetUser', 'client')
  fleetEmployees?: any[];

  @OneToMany('FleetVehicleGroup', 'client')
  clientVehicleGroups?: any[];

  @OneToMany('UserType', 'client')
  userTypes?: any[];

  @OneToMany('Tariff', 'client')
  clientTariffs?: any[];

  @OneToMany('VendorUser', 'client')
  vendorUsers?: any[];

  @OneToMany('Media', 'client')
  media?: any[];

  @OneToMany('OcpiEmsp', 'client')
  ocpieMSPs?: any[];

  @OneToMany('Wallet', 'client')
  wallets?: any[];

  @OneToMany('WalletTransaction', 'client')
  walletTransactions?: any[];

  @OneToMany('DeviceTransaction', 'client')
  deviceTransactions?: any[];

  @OneToMany('DeviceTransaction', 'initiatedClient')
  initiatedDeviceTransactions?: any[];

  @OneToMany('ChargingSession', 'client')
  chargingSessions?: any[];

  @OneToMany('ChargingSession', 'initiatedClient')
  initiatedChargingSessions?: any[];

  @OneToMany('StationFavourite', 'client')
  stationFavourites?: any[];

  @OneToMany('FleetDriverVehicle', 'client')
  fleetDriverVehicles?: any[];

  @OneToMany('ClientChargerAmc', 'client')
  clientChargerAmcs?: any[];

  @OneToMany('ClientSupport', 'client')
  clientSupports?: any[];

  @OneToMany('ClientSupport', 'creator')
  support?: any[];

  @OneToMany('SupportTicketMessage', 'client')
  supportMessages?: any[];

  @OneToMany('SupportTicketMessage', 'employee')
  supportEmployeeMessages?: any[];

  @OneToMany('OcpiCpo', 'client')
  ocpiCpo?: any[];

  @OneToOne(() => Address, (a) => a.client)
  clientAddress?: Address;

  @OneToMany('RoamingClient', 'exportClient')
  exportRoaming?: any[];

  @OneToMany('RoamingClient', 'importClient')
  importRoaming?: any[];

  @OneToMany('InternalRoaming', 'exportClient')
  exportCharger?: any[];

  @OneToMany('InternalRoaming', 'importClient')
  importCharger?: any[];

  @OneToMany('PayChargeQRCode', 'client')
  payChargeQRCodes?: any[];
}
