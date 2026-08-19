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
import { OcpiCpoLocation } from './ocpi-cpo-location.entity';
import { OcpiCpoConnector } from './ocpi-cpo-connector.entity';
import { OcpiCpoSession } from './ocpi-cpo-session.entity';
import { OcpiCpoTransaction } from './ocpi-cpo-transaction.entity';

@Entity('ocpicpoevses')
@Index(['locationId'])
@Index(['uid'])
export class OcpiCpoEvse {
  @PrimaryGeneratedColumn() id: number;
  @Column() locationId: number;
  @Column({ type: 'varchar', length: 255 }) uid: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) evse_id: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) floor_level: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) latitude: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) longitude: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) physical_reference: string | null;
  @Column({ type: 'datetime', nullable: true }) last_updated: Date | string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) status: string | null;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  // this.belongsTo(models.OcpiCpoLocation, { foreignKey: "locationId", as: "location", });
  @ManyToOne(() => OcpiCpoLocation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'locationId' })
  location: OcpiCpoLocation;

  // this.hasMany(models.OcpiCpoConnector, { foreignKey: "evseId", as: "connectors", });
  @OneToMany(() => OcpiCpoConnector, (connector) => connector.evse)
  connectors: OcpiCpoConnector[];

  // this.hasMany(models.OcpiCpoSession, { foreignKey: "evse_id", as: "sessions", });
  @OneToMany(() => OcpiCpoSession, (session) => session.evse)
  sessions: OcpiCpoSession[];

  // this.hasMany(models.OcpiCpoTransaction, { foreignKey: "evse_id", as: "transactions", });
  @OneToMany(() => OcpiCpoTransaction, (transaction) => transaction.evse)
  transactions: OcpiCpoTransaction[];
}
