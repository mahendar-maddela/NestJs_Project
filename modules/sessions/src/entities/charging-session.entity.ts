import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { SessionStatus, ChannelSource } from 'database/src/enums';
import { Staff } from '../../../clients/src/entities/staff.entity';
import { User } from '../../../users/src/entities/user.entity';
import { Charger } from '../../../chargers/src/entities/charger.entity';
import { DeviceTransaction } from './device-transaction.entity';
import { FleetUserDetail } from '../../../fleet/src/entities/fleet-user-detail.entity';
import { FleetUser } from '../../../fleet/src/entities/fleet-user.entity';
import { OcpiEmsp } from '../../../ocpi/src/entities/ocpi-emsp.entity';
import { OcpiToken } from '../../../ocpi/src/entities/ocpi-token.entity';
import { PaymentTransaction } from '../../../payments/src/entities/payment-transaction.entity';

@Entity('chargingsessions')
@Index(['clientId'])
@Index(['chargerRef'])
@Index(['userId'])
@Index(['sessionId'])
@Index(['nextActionAt'])
export class ChargingSession {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'int', nullable: true }) transactionId: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) sessionId: string | null;
  @Column({ type: 'int', nullable: true }) userId: number | null;
  @Column({ type: 'float', nullable: true }) maxEnergy: number | null;
  @Column({ type: 'float', nullable: true }) maxAmount: number | null;
  @Column({ type: 'int', nullable: true }) connectorId: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) chargerId: string | null;
  @Column({ type: 'text', nullable: true }) reason: string | null;
  @Column({ type: 'enum', enum: SessionStatus, nullable: true }) status: SessionStatus | null;
  @Column({ type: 'enum', enum: ChannelSource, nullable: true }) platform: ChannelSource | null;
  @Column({ type: 'enum', enum: ChannelSource, nullable: true }) stopFrom: ChannelSource | null;
  @Column({ type: 'enum', enum: ChannelSource, nullable: true }) startFrom: ChannelSource | null;
  @Column({ type: 'int', nullable: true }) chargerRef: number | null;
  @Column({ type: 'float', nullable: true }) calcTaxPercent: number | null;
  @Column({ type: 'float', nullable: true }) calcPrice: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) tariffName: string | null;
  @Column({ type: 'int', nullable: true }) fleetId: number | null;
  @Column({ type: 'int', nullable: true }) startDriverId: number | null;
  @Column({ type: 'int', nullable: true }) stopDriverId: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) rfidTag: string | null;
  @Column({ type: 'int', nullable: true }) emspId: number | null;
  @Column({ type: 'int', nullable: true }) tokenId: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) auth_ref: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) msp_res_url: string | null;
  @Column() clientId: number;
  @Column({ type: 'int', nullable: true }) initiatedClientId: number | null;
  @Column({ type: 'int', nullable: true }) maxChargingPercentage: number | null;
  @Column({ type: 'int', nullable: true }) paymentTransactionId: number | null;
  @Column({ type: 'int', nullable: true, default: 0 }) remoteStartAttempts: number | null;
  @Column({ type: 'datetime', nullable: true }) nextActionAt: Date | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) failureReason: string | null;
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

  @ManyToOne(() => DeviceTransaction)
  @JoinColumn({ name: 'transactionId' })
  transaction: DeviceTransaction | null;

  @ManyToOne(() => FleetUserDetail)
  @JoinColumn({ name: 'fleetId' })
  fleetUser: FleetUserDetail | null;

  @ManyToOne(() => OcpiEmsp)
  @JoinColumn({ name: 'emspId' })
  emsp: OcpiEmsp | null;

  @ManyToOne(() => FleetUser)
  @JoinColumn({ name: 'startDriverId' })
  startDriver: FleetUser | null;

  @ManyToOne(() => FleetUser)
  @JoinColumn({ name: 'stopDriverId' })
  stopDriver: FleetUser | null;

  @ManyToOne(() => OcpiToken)
  @JoinColumn({ name: 'tokenId' })
  token: OcpiToken | null;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'initiatedClientId' })
  initiatedClient: Staff | null;

  @ManyToOne(() => PaymentTransaction)
  @JoinColumn({ name: 'paymentTransactionId' })
  paymentTransaction: PaymentTransaction | null;
}
