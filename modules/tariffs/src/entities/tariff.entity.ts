import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Staff } from '../../../clients/src/entities/staff.entity';
import { Vendor } from '../../../vendors/src/entities/vendor.entity';
import { UserType } from '../../../vendors/src/entities/user-type.entity';
import { Charger } from '../../../chargers/src/entities/charger.entity';

@Entity('tariffs')
@Index(['clientId'])
@Index(['chargerId'])
@Index(['vendorId'])
export class Tariff {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'int', nullable: true }) userTypeId: number | null;
  @Column({ type: 'int', nullable: true }) vendorId: number | null;
  @Column({ type: 'int', nullable: true }) chargerId: number | null;
  @Column({ type: 'float', nullable: true }) price: number | null;
  @Column({ type: 'float', nullable: true }) gst: number | null;
  @Column() clientId: number;
  @Column({ type: 'int', nullable: true }) staffId: number | null;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;
  @Column({ type: 'datetime', nullable: true }) deletedAt: Date | null;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'clientId' })
  client: Staff;

  @ManyToOne(() => Vendor)
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor | null;

  @ManyToOne(() => UserType)
  @JoinColumn({ name: 'userTypeId' })
  userType: UserType | null;

  @ManyToOne(() => Charger)
  @JoinColumn({ name: 'chargerId' })
  charger?: Charger | null;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'staffId' })
  staff: Staff | null;
}
