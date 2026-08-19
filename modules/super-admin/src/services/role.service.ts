import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { RoleRepository } from '../repositories/role.repository';
import { CreateRoleDto, UpdateRoleDto, RoleQueryDto } from '../dto/role.dto';

@Injectable()
export class RoleService {
  constructor(private readonly roleRepository: RoleRepository) {}

  async createRole(dto: CreateRoleDto, superAdminId?: number) {
    const existRole = await this.roleRepository.findByNameAndSuperAdmin(dto.name, superAdminId);
    if (existRole) {
      throw new BadRequestException({
        success: false,
        message: 'Role already exists',
      });
    }

    const newRole = await this.roleRepository.createRoleWithPermissions(dto.name, superAdminId, dto.permissions);

    return {
      success: true,
      message: 'Role created successfully',
      data: newRole,
    };
  }

  async getAllRoles(query: RoleQueryDto, superAdminId?: number) {
    const pageNum = Math.max(Number(query.page) || 1, 1);
    const limitNum = Math.max(Number(query.limit) || 10, 1);
    const skip = (pageNum - 1) * limitNum;
    const search = query.search?.trim() || '';

    const where: any = {
      ...(search ? { name: { contains: search } } : {}),
    };

    const [count, roles] = await Promise.all([
      this.roleRepository.count(where),
      this.roleRepository.findPaginated(where, skip, limitNum),
    ]);

    return {
      success: true,
      message: 'Roles fetched successfully',
      data: roles,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum),
      },
    };
  }

  async getRoleById(id: number) {
    const role = await this.roleRepository.findById(id);
    if (!role) {
      throw new NotFoundException({ message: 'Role not found' });
    }

    const formattedRole = {
      id: role.id,
      name: role.name,
      superAdminId: role.superAdminId,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions: role.rolePermissions ? role.rolePermissions.map((rp) => rp.permission) : [],
    };

    return {
      success: true,
      message: 'Role fetched successfully',
      data: formattedRole,
    };
  }

  async updateRole(id: number, dto: UpdateRoleDto, superAdminId?: number) {
    const role = await this.roleRepository.findById(id);
    if (!role) {
      throw new NotFoundException({ message: 'Role not found' });
    }

    const updated = await this.roleRepository.updateRoleWithPermissions(id, dto.name, dto.permissions);

    return {
      success: true,
      message: 'Role updated successfully',
      data: updated,
    };
  }

  async deleteRole(id: number) {
    const role = await this.roleRepository.findById(id);
    if (!role) {
      throw new NotFoundException({ message: 'Role not found' });
    }

    await this.roleRepository.delete(id);

    return {
      success: true,
      message: 'Role deleted successfully',
    };
  }

  async getAllSuperPermission() {
    const permissions = await this.roleRepository.findAllPermissions();
    if (!permissions) {
      throw new BadRequestException({ success: false, message: 'Permission not Found' });
    }

    return {
      success: true,
      data: permissions,
      message: 'Fetched SuccessFully',
    };
  }
}
