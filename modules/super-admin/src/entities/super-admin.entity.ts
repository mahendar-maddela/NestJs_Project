import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { SuperRole } from './super-role.entity';
import { SuperDepartment } from './super-department.entity';

@Entity('superadmins')
export class SuperAdmin {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 255, nullable: true }) name: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) email: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) phone: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) password: string | null;
  @Column({ type: 'boolean', nullable: true, default: true }) isActive: boolean | null;
  @Column({ type: 'int', nullable: true }) roleId: number | null;
  @Column({ type: 'int', nullable: true }) departId: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) empId: string | null;
  @Column({ type: 'boolean', default: false }) twoFactorAuth: boolean;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => SuperRole)
  @JoinColumn({ name: 'roleId' })
  role?: SuperRole | null;

  @ManyToOne(() => SuperDepartment)
  @JoinColumn({ name: 'departId' })
  department?: SuperDepartment | null;
}
