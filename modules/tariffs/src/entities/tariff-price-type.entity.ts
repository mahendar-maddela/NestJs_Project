import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Tariff } from './tariff.entity';

@Entity('tariffpricetypes')
@Index(['tariffId'])
export class TariffPriceType {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'int', nullable: true }) tariffId: number | null;
  @Column({ type: 'int', nullable: true }) userTypeId: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) price: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) tax: string | null;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => Tariff)
  @JoinColumn({ name: 'tariffId' })
  tariff: Tariff | null;
}
