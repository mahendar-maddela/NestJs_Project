import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { Charger } from './charger.entity';

@Entity('chargerspecifications')
export class ChargerSpecification {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 255, nullable: true }) chargerId: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) model: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) serial: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) firmwareVersion: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) vendorName: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) meterType: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) meterSerialNumber: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) cpSerial: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) iccid: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) imsi: string | null;
  @Column({ unique: true }) chargerRef: number;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @OneToOne(() => Charger, (charger) => charger.specification)
  @JoinColumn({ name: 'chargerRef', referencedColumnName: 'id' })
  charger: Charger;
}
