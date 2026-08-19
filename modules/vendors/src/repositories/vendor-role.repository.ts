import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Role } from '../../../clients/src/entities/role.entity';
import { RolePermission } from '../../../clients/src/entities/role-permission.entity';
import { Permission } from '../../../clients/src/entities/permission.entity';
import { VendorRole } from '../entities/vendor-role.entity';

@Injectable()
export class VendorRoleRepository {
  constructor(
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(RolePermission) private readonly rolePermissionRepo: Repository<RolePermission>,
    @InjectRepository(Permission) private readonly permissionRepo: Repository<Permission>,
    @InjectRepository(VendorRole) private readonly vendorRoleRepo: Repository<VendorRole>,
  ) {}

  async findLinkedVendorIds(roleId: number): Promise<number[]> {
    const rows = await this.vendorRoleRepo.find({ where: { roleId }, select: { vendorId: true } });
    return rows.map((r) => r.vendorId);
  }

  createRole(data: Partial<Role>) {
    return this.roleRepo.save(this.roleRepo.create(data));
  }

  findPermissionsByIds(ids: number[], type?: string) {
    if (!ids.length) return Promise.resolve([]);
    return this.permissionRepo.find({ where: { id: In(ids), ...(type ? { type } : {}) } });
  }

  async addRolePermissions(roleId: number, permissionIds: number[]) {
    if (!permissionIds.length) return;
    await this.rolePermissionRepo.save(permissionIds.map((permissionId) => this.rolePermissionRepo.create({ roleId, permissionId })));
  }

  async replaceRolePermissions(roleId: number, permissionIds: number[]) {
    await this.rolePermissionRepo.delete({ roleId });
    await this.addRolePermissions(roleId, permissionIds);
  }

  findRolesByVendorId(vendorId: number) {
    return this.roleRepo.find({ where: { vendorId }, select: { id: true, name: true, vendorId: true } });
  }

  findRoleWithPermissions(id: number) {
    return this.roleRepo.findOne({
      where: { id },
      relations: { permissions: true },
    });
  }

  findById(id: number) {
    return this.roleRepo.findOne({ where: { id } });
  }

  async updateRoleName(id: number, name: string) {
    await this.roleRepo.update(id, { name });
  }

  async deleteRole(id: number) {
    await this.roleRepo.delete(id);
  }
}
