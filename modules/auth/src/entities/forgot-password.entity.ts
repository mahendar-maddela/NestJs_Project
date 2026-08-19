import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { ActorType } from 'database/src/enums';

@Entity('forgotpasswords')
@Index(['token'])
export class ForgotPassword {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 255 }) token: string;
  @Column() userId: number;
  @Column({ type: 'enum', enum: ActorType }) type: ActorType;
  @Column({ type: 'datetime', nullable: true }) expires_at: Date | null;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;
}
