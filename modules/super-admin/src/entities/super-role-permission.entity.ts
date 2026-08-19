import { Entity, PrimaryColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { SuperPermission } from './super-permission.entity';
import { SuperRole } from './super-role.entity';

@Entity('superrolepermissions')
export class SuperRolePermission {
  @PrimaryColumn() superRoleId: number;
  @PrimaryColumn() superPermissionId: number;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  @ManyToOne(() => SuperRole, (role) => role.rolePermissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'superRoleId' })
  role: SuperRole;

  @ManyToOne(() => SuperPermission, (permission) => permission.rolePermissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'superPermissionId' })
  permission: SuperPermission;
}
