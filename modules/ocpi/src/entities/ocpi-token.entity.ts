import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { ChargingSession } from '../../../sessions/src/entities/charging-session.entity';
import { OcpiCdr } from './ocpi-cdr.entity';

@Entity('ocpitokens')
@Index(['uid'])
@Index(['contract_id'])
export class OcpiToken {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 255, nullable: true }) uid: string | null;
  @Column({ type: 'int', nullable: true }) mspId: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) country_code: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) party_id: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) type: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) contract_id: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) visual_number: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) issuer: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) group_id: string | null;
  @Column({ type: 'boolean', nullable: true }) valid: boolean | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) whitelist: string | null;
  @Column({ type: 'datetime', nullable: true }) last_updated: Date | null;
  @Column({ type: 'boolean', default: false }) sendToMsp: boolean;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  // this.hasMany(models.ChargingSession, { foreignKey: "tokenId", as: "token_sessions", });
  @OneToMany(() => ChargingSession, (cs: any) => cs.token)
  token_sessions: ChargingSession[];

  // this.hasMany(models.OcpiCdr, { foreignKey: "tokenId", as: "cdrs", });
  @OneToMany(() => OcpiCdr, (cdr) => cdr.token)
  cdrs: OcpiCdr[];
}
