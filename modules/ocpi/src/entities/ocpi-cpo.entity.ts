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
import { OcpiCpoVersion } from './ocpi-cpo-version.entity';
import { OcpiCpoTariff } from './ocpi-cpo-tariff.entity';
import { OcpiCpoLocation } from './ocpi-cpo-location.entity';
import { OcpiCpoSession } from './ocpi-cpo-session.entity';
import { OcpiCpoTransaction } from './ocpi-cpo-transaction.entity';
import { OcpiCpoCdr } from './ocpi-cpo-cdr.entity';
import { OcpiLog } from './ocpi-log.entity';

@Entity('ocpicpos')
@Index(['clientId'])
@Index(['party_id', 'country_code'])
export class OcpiCpo {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 255, nullable: true }) token_a: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) token_b: string | null;
  @Column({ type: 'varchar', length: 3, nullable: true }) party_id: string | null;
  @Column({ type: 'varchar', length: 2, nullable: true }) country_code: string | null;
  @Column({ type: 'text', nullable: true }) url: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) selected_version: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) business_name: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) map_icon: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) business_website: string | null;
  @Column({ type: 'text', nullable: true }) business_logo: string | null;
  @Column({ type: 'varchar', length: 255, default: 'CPO' }) role: string;
  @Column({ type: 'enum', enum: OcpiConnectionStatus, default: 'PLANNED' }) status: OcpiConnectionStatus;
  @Column({ type: 'int', nullable: true }) clientId: number | null;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  // this.belongsTo(models.Staff, { foreignKey: "clientId", as: "client", });
  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'clientId' })
  client: Staff;

  // this.hasMany(models.OcpiCpoVersion, { foreignKey: "cpoId", as: "versions", });
  @OneToMany(() => OcpiCpoVersion, (version) => version.cpo)
  versions: OcpiCpoVersion[];

  // this.hasMany(models.OcpiCpoTariff, { foreignKey: "cpoId", as: "tariff", });
  @OneToMany(() => OcpiCpoTariff, (tariff) => tariff.cpo)
  tariff: OcpiCpoTariff[];

  // this.hasMany(models.OcpiCpoLocation, { foreignKey: "cpoId", as: "locations", });
  @OneToMany(() => OcpiCpoLocation, (location) => location.cpo)
  locations: OcpiCpoLocation[];

  // this.hasMany(models.OcpiCpoSession, { foreignKey: "cpo_id", as: "sessions", });
  @OneToMany(() => OcpiCpoSession, (session) => session.cpo)
  sessions: OcpiCpoSession[];

  // this.hasMany(models.OcpiCpoTransaction, { foreignKey: "cpo_id", as: "transactions", });
  @OneToMany(() => OcpiCpoTransaction, (transaction) => transaction.cpo)
  transactions: OcpiCpoTransaction[];

  // this.hasMany(models.OcpiCpoCdr, { foreignKey: "cpo_id", as: "cdrs", });
  @OneToMany(() => OcpiCpoCdr, (cdr) => cdr.cpo)
  cdrs: OcpiCpoCdr[];

  // this.hasMany(models.OcpiLog, { foreignKey: "cpoId", as: "logs", });
  @OneToMany(() => OcpiLog, (log) => log.cpo)
  logs: OcpiLog[];
}
