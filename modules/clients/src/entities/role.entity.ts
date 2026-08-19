import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
  JoinColumn,
  Index,
} from 'typeorm';
import { Staff } from './staff.entity';
import { Permission } from './permission.entity';
import { Vendor } from '../../../vendors/src/entities/vendor.entity';

@Entity('roles')
@Index(['clientId'])
export class Role {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 255 }) name: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) description: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) type: string | null;
  @Column({ type: 'int', nullable: true }) staffId: number | null;
  @Column() clientId: number;
  @Column({ type: 'int', nullable: true }) vendorId: number | null;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }) updatedAt: Date;

  // this.belongsToMany(models.Staff, { through: models.Staff_Role, as: 'staff', foreignKey: 'roleId', constraints: false, });
  @ManyToMany(() => Staff)
  @JoinTable({
    name: 'staff_roles',
    joinColumn: { name: 'roleId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'staffId', referencedColumnName: 'id' },
  })
  staff?: Staff[];

  // this.belongsToMany(models.Permission, { through: models.Role_Permission, foreignKey: "roleId", as: "permissions", onDelete: 'CASCADE', });
  @ManyToMany(() => Permission)
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'roleId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permissionId', referencedColumnName: 'id' },
  })
  permissions?: Permission[];

  // this.belongsToMany(models.Vendor, { through: models.Vendor_Role, foreignKey: "roleId", as: 'vendorRole', constraints: false, });
  @ManyToMany(() => Vendor)
  @JoinTable({
    name: 'vendor_roles',
    joinColumn: { name: 'roleId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'vendorId', referencedColumnName: 'id' },
  })
  vendorRole?: Vendor[];

  // this.belongsTo(models.Vendor, { foreignKey: 'vendorId', as: 'vendor' });
  @ManyToOne(() => Vendor)
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor | null;

  // this.belongsTo(models.Staff, { foreignKey: 'staffId', as: 'createdStaff' });
  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'staffId' })
  createdStaff?: Staff | null;

  // this.belongsTo(models.Staff, { foreignKey: 'clientId', as: 'client' });
  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'clientId' })
  client: Staff;
}
