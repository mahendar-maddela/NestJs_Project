import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ConnectorStatus } from 'database/src/enums';
import { Charger } from './charger.entity';

@Entity('connectors')
@Index(['chargerId'])
export class Connector {
  @PrimaryGeneratedColumn() id: number;
  @Column() chargerId: number;
  @Column({ type: 'varchar', length: 255, nullable: true }) portType: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) max_power: string | null;
  @Column({ type: 'varchar', length: 255 }) connectorId: string;
  @Column({ type: 'int', nullable: true }) tariffId: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) info: string | null;
  @Column({ type: 'enum', enum: ConnectorStatus, default: 'Unavailable' }) status: ConnectorStatus;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => Charger)
  @JoinColumn({ name: 'chargerId' })
  charger: Charger;
}
