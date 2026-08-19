import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { OcpiConnectionStatus } from 'database/src/enums';
import { Staff } from '../../../clients/src/entities/staff.entity';
import { OcpiVersion } from './ocpi-version.entity';
import { OcpiPushStation } from './ocpi-push-station.entity';
import { OcpiPushedTariff } from './ocpi-pushed-tariff.entity';
import { OcpiCdr } from './ocpi-cdr.entity';
import { OcpiLog } from './ocpi-log.entity';
import { ChargingSession } from '../../../sessions/src/entities/charging-session.entity';
import { DeviceTransaction } from '../../../sessions/src/entities/device-transaction.entity';

@Entity('ocpiemsps')
@Index(['clientId'])
@Index(['party_id', 'country_code'])
export class OcpiEmsp {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 255, nullable: true }) token_a: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) token_b: string | null;
  @Column({ type: 'varchar', length: 3, nullable: true }) party_id: string | null;
  @Column({ type: 'varchar', length: 2, nullable: true }) country_code: string | null;
  @Column({ type: 'text', nullable: true }) url: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) selected_version: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) business_name: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) business_website: string | null;
  @Column({ type: 'text', nullable: true }) business_logo: string | null;
  @Column({ type: 'varchar', length: 255, default: 'EMSP' }) role: string;
  @Column({ type: 'enum', enum: OcpiConnectionStatus, default: 'PLANNED' }) status: OcpiConnectionStatus;
  @Column() clientId: number;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  // this.belongsTo(models.Staff, { foreignKey: "clientId", as: "client", });
  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'clientId' })
  client: Staff;

  // this.hasMany(models.OcpiVersion, { foreignKey: "emspId", as: "versions", });
  @OneToMany(() => OcpiVersion, (version) => version.emsp)
  versions: OcpiVersion[];

  // this.hasMany(models.OcpiPushStation, { foreignKey: 'emspId', as: "emsp_pushed_stations" });
  @OneToMany(() => OcpiPushStation, (station) => station.emsp)
  emsp_pushed_stations: OcpiPushStation[];

  // this.hasMany(models.OcpiPushedTariff, { foreignKey: 'emspId', as: "emsp_pushed_tariffs" });
  @OneToMany(() => OcpiPushedTariff, (tariff) => tariff.emsp)
  emsp_pushed_tariffs: OcpiPushedTariff[];

  // this.hasMany(models.OcpiCdr, { foreignKey: "emspId", as: "cdrs", });
  @OneToMany(() => OcpiCdr, (cdr) => cdr.emsp)
  cdrs: OcpiCdr[];

  // this.hasMany(models.OcpiLog, { foreignKey: "emspId", as: "logs", });
  @OneToMany(() => OcpiLog, (log) => log.emsp)
  logs: OcpiLog[];

  // this.hasMany(models.ChargingSession, { foreignKey: "emspId", as: "chargingSessions", });
  @OneToMany(() => ChargingSession, (cs: any) => cs.emsp)
  chargingSessions: ChargingSession[];

  // this.hasMany(models.DeviceTransaction, { foreignKey: "emspId", as: "deviceTransactions", });
  @OneToMany(() => DeviceTransaction, (dt: any) => dt.emsp)
  deviceTransactions: DeviceTransaction[];
}
