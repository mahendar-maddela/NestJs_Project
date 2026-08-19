import { Injectable, NotFoundException } from '@nestjs/common';
import { VendorRoleRepository } from '../repositories/vendor-role.repository';

/** Mirrors `controllers/vendors/roleController.js`. */
@Injectable()
export class VendorRoleService {
  constructor(private readonly repo: VendorRoleRepository) {}

  async createRole(vendorId: number, clientId: number, dto: { name: string; permission?: number[] }) {
    const newRole = await this.repo.createRole({ name: dto.name, type: 'vendor', vendorId, clientId });

    if (dto.permission && dto.permission.length > 0) {
      const foundPermissions = await this.repo.findPermissionsByIds(dto.permission, 'vendor');
      await this.repo.addRolePermissions(newRole.id, foundPermissions.map((p) => p.id));
    }

    return { success: true, message: 'Role created successfully', data: newRole };
  }

  async getRoles(vendorId: number) {
    const roles = await this.repo.findRolesByVendorId(vendorId);
    const data = await Promise.all(
      roles.map(async (role) => {
        const vendorIds = await this.repo.findLinkedVendorIds(role.id);
        return { ...role, vendorRole: vendorIds.map((id) => ({ id })) };
      }),
    );

    return { success: true, message: 'Roles fetched successfully', data };
  }

  async getRoleById(id: number) {
    const role = await this.repo.findRoleWithPermissions(id);
    if (!role) {
      throw new NotFoundException({ message: 'Role not found' });
    }

    const permissions = (role.permissions || [])
      .map((p: any) => (p.permission ? p.permission : p))
      .filter((p: any) => p && p.type === 'vendor');

    return { success: true, message: 'Role fetched successfully', data: { ...role, permissions } };
  }

  async updateRole(id: number, dto: { name?: string; permission?: number[] }) {
    const role = await this.repo.findById(id);
    if (!role) {
      throw new NotFoundException({ message: 'Role not found' });
    }

    if (dto.name !== undefined) {
      await this.repo.updateRoleName(id, dto.name);
    }

    if (dto.permission) {
      // Legacy's remove-then-set-permissions sequence nets out to a full replace, unfiltered by type.
      await this.repo.replaceRolePermissions(id, dto.permission);
    }

    const updated = await this.repo.findById(id);
    return { success: true, message: 'Role updated successfully', data: updated };
  }

  async deleteRole(id: number) {
    const role = await this.repo.findById(id);
    if (!role) {
      throw new NotFoundException({ message: 'Role not found' });
    }
    await this.repo.deleteRole(id);
    return { success: true, message: 'Role deleted successfully' };
  }
}
