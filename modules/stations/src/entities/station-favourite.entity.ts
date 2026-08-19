import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Station } from './station.entity';
import { User } from '../../../users/src/entities/user.entity';

@Entity('stationfavourites')
@Index(['clientId'])
export class StationFavourite {
  @PrimaryColumn() userId: number;
  @PrimaryColumn() stationId: number;
  @Column() clientId: number;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => Station)
  @JoinColumn({ name: 'stationId' })
  station: Station;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}
