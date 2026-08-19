import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToOne, JoinColumn } from 'typeorm';
import { UserLoginChannel } from 'database/src/enums';
import { Staff } from './staff.entity';

@Entity('credentialconfigs')
@Index(['clientId'])
export class CredentialConfig {
  @PrimaryGeneratedColumn() id: number;
  @Column() clientId: number;
  @Column({ type: 'varchar', length: 255, nullable: true }) email: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) emailHost: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) mailPassKey: string | null;
  @Column({ type: 'enum', enum: UserLoginChannel, nullable: true }) userLoginType: UserLoginChannel | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) authKey: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) template: string | null;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @OneToOne(() => Staff)
  @JoinColumn({ name: 'clientId' })
  client: Staff;
}
