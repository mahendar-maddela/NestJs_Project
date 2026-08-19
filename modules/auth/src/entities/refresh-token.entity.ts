import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { ActorType } from 'database/src/enums';

@Entity('refreshtokens')
@Index(['userId', 'type'])
export class RefreshToken {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'text' }) token: string;
  @Column() userId: number;
  @Column({ type: 'datetime' }) expire: Date;
  @Column({ type: 'enum', enum: ActorType }) type: ActorType;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;
}
