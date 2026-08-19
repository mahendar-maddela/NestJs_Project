import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminRoleRepository } from '../repositories/admin-role.repository';

@Injectable()
export class AdminRoleService {
  constructor(private readonly adminRoleRepository: AdminRoleRepository) {}

  async createRole(body: any, staffId: number, clientId: number) {
    const { name, description, permissions } = body;

    const existRole = await this.adminRoleRepository.findByNameAndClient(name, clientId);
    if (existRole) {
      throw new BadRequestException({
        success: false,
        message: 'Role name already exists for staff',
      });
    }

    const newRole = await this.adminRoleRepository.createRole({
      name,
      description,
      type: 'staff',
      staffId,
      clientId,
      permissionIds: permissions,
    });

    return {
      success: true,
      message: 'Role created successfully',
      data: newRole,
    };
  }

  async getAllRoles(clientId: number) {
    const roles = await this.adminRoleRepository.findAllByClient(clientId);

    const formattedRoles = roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      type: r.type,
      staffId: r.staffId,
      clientId: r.clientId,
      permissions: (r.permissions || []).map((p: any) => ({ id: p.id || p.permission?.id })),
      staff: r.client ? { id: r.client.id } : null,
    }));

    return {
      success: true,
      message: 'Roles fetched successfully',
      data: formattedRoles,
    };
  }

  async getRoleById(id: number, clientId: number) {
    const role = await this.adminRoleRepository.findByIdAndClient(id, clientId);
    if (!role) {
      throw new NotFoundException({ message: 'Role not found' });
    }

    const formattedRole = {
      id: role.id,
      name: role.name,
      description: role.description,
      type: role.type,
      staffId: role.staffId,
      clientId: role.clientId,
      permissions: (role.permissions || []).map((p: any) => ({
        id: p.id || p.permission?.id,
        name: p.name || p.permission?.name,
      })),
    };

    return {
      success: true,
      message: 'Role fetched successfully',
      data: formattedRole,
    };
  }

  async updateRole(id: number, body: any, clientId: number) {
    const role = await this.adminRoleRepository.findByIdAndClient(id, clientId);
    if (!role) {
      throw new NotFoundException({ message: 'Role not found' });
    }

    if (body.name) {
      const existRole = await this.adminRoleRepository.findByNameAndClient(body.name, clientId, id);
      if (existRole) {
        throw new BadRequestException({
          success: false,
          message: 'Role name already exists for staff',
        });
      }
    }

    const updatedRole = await this.adminRoleRepository.updateRole(id, clientId, {
      name: body.name,
      description: body.description,
      permissionIds: body.permissions,
    });

    return {
      success: true,
      message: 'Role updated successfully',
      data: updatedRole,
    };
  }

  async deleteRole(id: number, clientId: number) {
    const role = await this.adminRoleRepository.findByIdAndClient(id, clientId);
    if (!role) {
      throw new NotFoundException({ message: 'Role not found' });
    }

    await this.adminRoleRepository.deleteRole(id);

    return {
      success: true,
      message: 'Role deleted successfully',
    };
  }
}
