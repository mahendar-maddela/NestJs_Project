import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { CreditStatus } from 'database/src/enums';
import { User } from '../../../users/src/entities/user.entity';
import { Vendor } from '../../../vendors/src/entities/vendor.entity';

@Entity('credits')
@Index(['userId'])
@Index(['vendorId'])
export class Credit {
  @PrimaryGeneratedColumn() id: number;
  @Column() userId: number;
  @Column() vendorId: number;
  @Column({ type: 'float', nullable: true, default: 0 }) balance: number | null;
  @Column({ type: 'enum', enum: CreditStatus, default: 'Active' }) status: CreditStatus;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Vendor)
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor;
}
