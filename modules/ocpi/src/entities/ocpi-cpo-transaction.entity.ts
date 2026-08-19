import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../../users/src/entities/user.entity';
import { OcpiCpo } from './ocpi-cpo.entity';
import { OcpiCpoSession } from './ocpi-cpo-session.entity';
import { OcpiCpoEvse } from './ocpi-cpo-evse.entity';

@Entity('ocpicpotransactions')
@Index(['cpo_id'])
@Index(['session_id'])
@Index(['authorization_reference'])
export class OcpiCpoTransaction {
  @PrimaryGeneratedColumn() id: number;
  @Column() cpo_id: number;
  @Column({ type: 'varchar', length: 2, nullable: true }) country_code: string | null;
  @Column({ type: 'varchar', length: 3, nullable: true }) party_id: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) session_id: string | null;
  @Column({ type: 'int', nullable: true }) evse_id: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) evse_uid: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) connector_id: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) location_id: string | null;
  @Column({ type: 'int', nullable: true }) user_id: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) start_date_time: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) end_date_time: string | null;
  @Column({ type: 'float', nullable: true, default: 0 }) kwh: number | null;
  @Column({ type: 'json', nullable: true }) cdr_token: unknown;
  @Column({ type: 'varchar', length: 255, nullable: true }) auth_method: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) authorization_reference: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) meter_id: string | null;
  @Column({ type: 'varchar', length: 3, nullable: true }) currency: string | null;
  @Column({ type: 'json', nullable: true }) charging_periods: unknown;
  @Column({ type: 'json', nullable: true }) total_cost: unknown;
  @Column({ type: 'float', nullable: true }) price: number | null;
  @Column({ type: 'float', nullable: true }) tax: number | null;
  @Column({ type: 'float', nullable: true }) total_price: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) status: string | null;
  @Column({ type: 'float', nullable: true }) startSoc: number | null;
  @Column({ type: 'float', nullable: true }) stopSoc: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) last_updated: string | null;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  // this.belongsTo(models.OcpiCpo, { foreignKey: "cpo_id", as: "cpo", });
  @ManyToOne(() => OcpiCpo)
  @JoinColumn({ name: 'cpo_id' })
  cpo: OcpiCpo;

  // this.belongsTo(models.User, { foreignKey: "user_id", as: "user", });
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  // this.belongsTo(models.OcpiCpoEvse, { foreignKey: "evse_id", as: "evse", });
  @ManyToOne(() => OcpiCpoEvse)
  @JoinColumn({ name: 'evse_id' })
  evse: OcpiCpoEvse | null;

  // this.hasOne(models.OcpiCpoSession, { foreignKey: "transactionId", as: "session", });
  @OneToOne(() => OcpiCpoSession, (session) => session.transaction)
  session: OcpiCpoSession | null;
}
