import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index, OneToOne } from 'typeorm';
import { PowerType, ChargerStatus } from 'database/src/enums';
import { Staff } from '../../../clients/src/entities/staff.entity';
import { Vendor } from '../../../vendors/src/entities/vendor.entity';
import { Station } from '../../../stations/src/entities/station.entity';
import { Connector } from './connector.entity';
import { Tariff } from '../../../tariffs/src/entities/tariff.entity';
import { RoamingTariff } from '../../../ocpi/src/entities/roaming-tariff.entity';
import { ChargerSpecification } from './charger-specification.entity';
import { ChargerConfiguration } from './charger-configuration.entity';
import { DeviceTransaction } from '../../../sessions/src/entities/device-transaction.entity';
import { ChargingSession } from '../../../sessions/src/entities/charging-session.entity';
import { CpoAmc } from '../../../billing/src/entities/cpo-amc.entity';
import { CpoSettlement } from '../../../billing/src/entities/cpo-settlement.entity';
import { OcpiPushStation } from '../../../ocpi/src/entities/ocpi-push-station.entity';
import { ClientChargerAmc } from '../../../billing/src/entities/client-charger-amc.entity';
import { InternalRoaming } from '../../../ocpi/src/entities/internal-roaming.entity';

@Entity('chargers')
@Index(['clientId'])
@Index(['chargerId'])
@Index(['stationId'])
export class Charger {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'float', nullable: true }) capacity: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) network_type: string | null;
  @Column({ type: 'varchar', length: 255 }) chargerId: string;
  @Column({ type: 'int', nullable: true }) stationId: number | null;
  @Column({ type: 'int', nullable: true }) vendorId: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) portType: string | null;
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    transformer: {
      to: (value: string[] | string | null): string | null => {
        if (Array.isArray(value)) {
          return value.join(',');
        }
        return value ?? null;
      },
      from: (value: string | null): string[] | string | null => {
        if (!value) return null;
        if (typeof value === 'string') {
          return value.split(',').map((type) => type.trim()).filter(Boolean);
        }
        return value;
      },
    },
  })
  vehicleType: string[] | string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) brand: string | null;
  @Column({ type: 'enum', enum: PowerType, nullable: true }) powerType: PowerType | null;
  @Column({ type: 'enum', enum: ChargerStatus, default: 'InActive' }) status: ChargerStatus;
  @Column({ type: 'int', nullable: true }) staffId: number | null;
  @Column({ type: 'int', nullable: true }) createdBy: number | null;
  @Column() clientId: number;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'clientId' })
  client: Staff;

  @ManyToOne(() => Station)
  @JoinColumn({ name: 'stationId' })
  station: Station | null;

  @ManyToOne(() => Vendor)
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor | null;

  @OneToMany(() => Connector, (connector) => connector.charger)
  connectors: Connector[];

  @OneToMany(() => Tariff, (t) => t.charger)
  tariff: Tariff[];

  @OneToMany(() => RoamingTariff, (rt) => rt.charger)
  roamingTariffs: RoamingTariff[];

  @OneToOne(
    () => ChargerSpecification,
    (chargerSpecification) => chargerSpecification.charger,
  )
  specification: ChargerSpecification | null;

  @OneToMany(() => ChargerConfiguration, (cc) => cc.charger)
  chargerConfigurations?: ChargerConfiguration[];

  @OneToMany(() => ChargerConfiguration, (cc) => cc.charger)
  configuration?: ChargerConfiguration[];

  @OneToMany(() => DeviceTransaction, (dt) => dt.charger)
  deviceTransactions?: DeviceTransaction[];

  @OneToMany(() => DeviceTransaction, (dt) => dt.charger)
  transactions?: DeviceTransaction[];

  @OneToMany(() => ChargingSession, (cs) => cs.charger)
  chargingSessions?: ChargingSession[];

  @OneToMany(() => ChargingSession, (cs) => cs.charger)
  chargingSession?: ChargingSession[];

  @OneToMany(() => CpoAmc, (ca) => ca.charger)
  cpoAmcs?: CpoAmc[];

  @OneToMany(() => CpoAmc, (ca) => ca.charger)
  cpoAmc?: CpoAmc[];

  @OneToMany(() => CpoSettlement, (cs) => cs.charger)
  cpoSettlements?: CpoSettlement[];

  @OneToMany(() => CpoSettlement, (cs) => cs.charger)
  cpoSettlement?: CpoSettlement[];

  @OneToMany(() => OcpiPushStation, (ops) => ops.charger)
  ocpiPushStations?: OcpiPushStation[];

  @OneToMany(() => OcpiPushStation, (ops) => ops.charger)
  emsp_pushed_chargers?: OcpiPushStation[];

  @OneToMany(() => ClientChargerAmc, (cca) => cca.charger)
  clientChargerAmcs?: ClientChargerAmc[];

  @OneToMany(() => InternalRoaming, (ir) => ir.charger)
  internalRoamings?: InternalRoaming[];

  @OneToMany(() => InternalRoaming, (ir) => ir.charger)
  internalRoaming?: InternalRoaming[];

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'staffId' })
  createdStaff?: Staff | null;

  @ManyToOne(() => Vendor)
  @JoinColumn({ name: 'createdBy' })
  createdVendor?: Vendor | null;
}
