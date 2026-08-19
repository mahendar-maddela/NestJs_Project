import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { OcpiCpo } from './ocpi-cpo.entity';
import { OcpiEmsp } from './ocpi-emsp.entity';

@Entity('ocpilogs')
@Index(['cpoId'])
@Index(['emspId'])
export class OcpiLog {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'text', nullable: true }) request_body: string | null;
  @Column({ type: 'text', nullable: true }) response_body: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) request_type: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) endpoint: string | null;
  @Column({ type: 'int', nullable: true }) status_code: number | null;
  @Column({ type: 'int', nullable: true }) emspId: number | null;
  @Column({ type: 'int', nullable: true }) cpoId: number | null;
  @Column({ type: 'int', nullable: true }) response_time_ms: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) from: string | null;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  // this.belongsTo(models.OcpieMSP, { foreignKey: "emspId", as: "emsp" });
  @ManyToOne(() => OcpiEmsp, (emsp) => emsp.logs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'emspId' })
  emsp?: OcpiEmsp;

  // this.belongsTo(models.OcpiCpo, { foreignKey: "cpoId", as: "cpo" });
  @ManyToOne(() => OcpiCpo, (cpo) => cpo.logs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cpoId' })
  cpo?: OcpiCpo;
}
