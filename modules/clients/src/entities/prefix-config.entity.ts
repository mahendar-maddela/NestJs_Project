import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToOne, JoinColumn } from 'typeorm';
import { Staff } from './staff.entity';

@Entity('prefixconfigs')
@Index(['clientId'])
export class PrefixConfig {
  @PrimaryGeneratedColumn() id: number;
  @Column() clientId: number;
  @Column({ type: 'varchar', length: 255, nullable: true }) session: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) coupon: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) wallet: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) cpo: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) station: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) employee: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) fleet: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) user: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) driver: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) vehicleGroup: string | null;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @OneToOne(() => Staff)
  @JoinColumn({ name: 'clientId' })
  client: Staff;
}
