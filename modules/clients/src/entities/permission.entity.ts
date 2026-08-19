import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Role } from './role.entity';
import { RolePermission } from './role-permission.entity';
import { IndividualPermission } from './individual-permission.entity';
import { Staff } from './staff.entity';
import { Vendor } from '../../../vendors/src/entities/vendor.entity';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 255 }) name: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) type: string | null;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  // 1. Direct join rows for Role_Permission
  @OneToMany(() => RolePermission, (rp) => rp.permission)
  rolePermissions?: RolePermission[];

  // 2. Direct join rows for IndividualPermission
  @OneToMany(() => IndividualPermission, (ip) => ip.permission)
  individualPermissions?: IndividualPermission[];

  // 3. Many-to-Many Roles: this.belongsToMany(models.Role, { through: models.Role_Permission, foreignKey: "permissionId" })
  @ManyToMany(() => Role)
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'permissionId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'roleId', referencedColumnName: 'id' },
  })
  roles?: Role[];

  // 4. Many-to-Many Staff: this.belongsToMany(models.Staff, { through: models.IndividualPermission, foreignKey: "permissionId" })
  @ManyToMany(() => Staff)
  @JoinTable({
    name: 'individualpermissions',
    joinColumn: { name: 'permissionId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'staffId', referencedColumnName: 'id' },
  })
  staff?: Staff[];

  // 5. Many-to-Many Vendors: this.belongsToMany(models.Vendor, { through: models.IndividualPermission, foreignKey: "permissionId" })
  @ManyToMany(() => Vendor)
  @JoinTable({
    name: 'individualpermissions',
    joinColumn: { name: 'permissionId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'vendorId', referencedColumnName: 'id' },
  })
  vendors?: Vendor[];
}
