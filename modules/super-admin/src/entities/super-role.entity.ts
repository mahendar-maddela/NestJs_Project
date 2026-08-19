import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { SuperRolePermission } from './super-role-permission.entity';
import { SuperAdmin } from './super-admin.entity';

@Entity('superroles')
export class SuperRole {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'int', nullable: true }) superAdminId: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) name: string | null;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @OneToMany(() => SuperRolePermission, (rp) => rp.role)
  rolePermissions: SuperRolePermission[];

  @OneToMany(() => SuperAdmin, (sa) => sa.role)
  superAdmins?: SuperAdmin[];
}
