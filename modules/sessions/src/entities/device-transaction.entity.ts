import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, OneToOne, JoinColumn, Index } from 'typeorm';
import { ChannelSource } from 'database/src/enums';
import { Staff } from '../../../clients/src/entities/staff.entity';
import { User } from '../../../users/src/entities/user.entity';
import { Vehicle } from '../../../users/src/entities/vehicle.entity';
import { Charger } from '../../../chargers/src/entities/charger.entity';
import { OcpiEmsp } from '../../../ocpi/src/entities/ocpi-emsp.entity';
import { FleetUserDetail } from '../../../fleet/src/entities/fleet-user-detail.entity';
import { FleetUser } from '../../../fleet/src/entities/fleet-user.entity';
import { PaymentTransaction } from '../../../payments/src/entities/payment-transaction.entity';
import type { TransactionDetail } from './transaction-detail.entity';
import type { ChargingSession } from './charging-session.entity';
import type { WalletTransaction } from '../../../wallet/src/entities/wallet-transaction.entity';

@Entity('devicetransactions')
@Index(['clientId'])
@Index(['chargerRef'])
@Index(['userId'])
@Index(['emspId', 'createdAt'])
export class DeviceTransaction {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'bigint', nullable: true, transformer: { to: (v) => v, from: (v) => (v === null ? null : Number(v)) } })
  transactionId: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) macId: string | null;
  @Column({ type: 'int', nullable: true }) vehicleId: number | null;
  @Column({ type: 'int', nullable: true }) chargerRef: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) chargerId: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) connectorId: string | null;
  @Column({ type: 'int', nullable: true }) userId: number | null;
  @Column({ type: 'datetime', nullable: true }) startDate: Date | null;
  @Column({ type: 'datetime', nullable: true }) stopDate: Date | null;
  @Column({ type: 'float', nullable: true }) charginDuration: number | null;
  @Column({ type: 'float', nullable: true }) startMeterValue: number | null;
  @Column({ type: 'float', nullable: true }) stopMeterValue: number | null;
  @Column({ type: 'float', nullable: true }) totalWh: number | null;
  @Column({ type: 'tinyint', nullable: true }) status: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) reason: string | null;
  @Column({ type: 'float', nullable: true }) amount: number | null;
  @Column({ type: 'float', nullable: true }) gst: number | null;
  @Column({ type: 'float', nullable: true }) price: number | null;
  @Column({ type: 'float', nullable: true }) maxEnergy: number | null;
  @Column({ type: 'float', nullable: true }) maxAmount: number | null;
  @Column({ type: 'float', nullable: true }) startSoc: number | null;
  @Column({ type: 'float', nullable: true }) stopSoc: number | null;
  @Column({ type: 'boolean', nullable: true }) isDualMode: boolean | null;
  @Column({ type: 'bigint', nullable: true, transformer: { to: (v) => v, from: (v) => (v === null ? null : Number(v)) } })
  meterValueStore: number | null;
  @Column({ type: 'enum', enum: ChannelSource, nullable: true }) platform: ChannelSource | null;
  @Column({ type: 'enum', enum: ChannelSource, nullable: true }) stopFrom: ChannelSource | null;
  @Column({ type: 'enum', enum: ChannelSource, nullable: true }) startFrom: ChannelSource | null;
  @Column({ type: 'float', nullable: true }) calcTaxPercent: number | null;
  @Column({ type: 'float', nullable: true }) calcPrice: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) tariffName: string | null;
  @Column({ type: 'int', nullable: true }) fleetId: number | null;
  @Column({ type: 'int', nullable: true }) startDriverId: number | null;
  @Column({ type: 'int', nullable: true }) stopDriverId: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) rfidTag: string | null;
  @Column({ type: 'int', nullable: true }) emspId: number | null;
  @Column({ type: 'boolean', default: false }) isAbnormalStop: boolean;
  @Column() clientId: number;
  @Column({ type: 'int', nullable: true }) initiatedClientId: number | null;
  @Column({ type: 'int', nullable: true }) paymentTransactionId: number | null;
  @Column({ type: 'boolean', nullable: true }) isOverConsumedQr: boolean | null;
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }) pendingRecoveryAmountQr: string | null;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'clientId' })
  client: Staff;

  @ManyToOne(() => Charger)
  @JoinColumn({ name: 'chargerRef' })
  charger: Charger | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @ManyToOne(() => Vehicle)
  @JoinColumn({ name: 'vehicleId' })
  vehicle: Vehicle | null;

  @ManyToOne(() => OcpiEmsp)
  @JoinColumn({ name: 'emspId' })
  emsp: OcpiEmsp | null;

  @ManyToOne(() => FleetUserDetail)
  @JoinColumn({ name: 'fleetId' })
  fleetUser: FleetUserDetail | null;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'initiatedClientId' })
  initiatedClient: Staff | null;

  @ManyToOne(() => FleetUser)
  @JoinColumn({ name: 'startDriverId' })
  startDriver: FleetUser | null;

  @ManyToOne(() => FleetUser)
  @JoinColumn({ name: 'stopDriverId' })
  stopDriver: FleetUser | null;

  @ManyToOne(() => PaymentTransaction)
  @JoinColumn({ name: 'paymentTransactionId' })
  paymentTransaction: PaymentTransaction | null;

  @OneToMany('TransactionDetail', 'transaction')
  transactionDetails?: TransactionDetail[];

  @OneToMany('ChargingSession', 'transaction')
  sessions?: ChargingSession[];

  @OneToOne('WalletTransaction', 'transaction')
  walletTransaction?: WalletTransaction | null;
}
