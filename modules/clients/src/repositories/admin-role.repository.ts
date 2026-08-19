import { Injectable } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { RolePermission } from '../entities/role-permission.entity';

@Injectable()
export class AdminRoleRepository {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepo: Repository<RolePermission>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async findByNameAndClient(name: string, clientId: number, excludeId?: number) {
    const qb = this.roleRepo
      .createQueryBuilder('r')
      .where('r.name = :name AND r.type = :type AND r.clientId = :clientId', {
        name,
        type: 'staff',
        clientId,
      });
    if (excludeId) qb.andWhere('r.id != :excludeId', { excludeId });
    return qb.getRawOne();
  }

  async findByIdAndClient(id: number, clientId: number) {
    return this.roleRepo.findOne({
      where: { id, clientId },
      relations: { permissions: true },
    });
  }

  async findAllByClient(clientId: number) {
    return this.roleRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.permissions', 'p')
      .leftJoin('r.client', 'c')
      .where('r.staffId IS NOT NULL AND r.clientId = :clientId', { clientId })
      .orderBy('r.createdAt', 'DESC')
      .getMany();
  }

  async createRole(data: {
    name: string;
    description?: string;
    type: string;
    staffId: number;
    clientId: number;
    permissionIds?: number[];
  }) {
    return this.dataSource.transaction(async (manager) => {
      const newRole = await manager.save(
        Role,
        manager.create(Role, {
          name: data.name,
          description: data.description,
          type: data.type,
          staffId: data.staffId,
          clientId: data.clientId,
        }),
      );

      if (data.permissionIds && data.permissionIds.length > 0) {
        const foundPermissions = await manager.find(Permission, {
          where: data.permissionIds.map((id) => ({ id })),
          select: { id: true },
        });

        if (foundPermissions.length > 0) {
          const rps = foundPermissions.map((p) =>
            manager.create(RolePermission, { roleId: newRole.id, permissionId: p.id }),
          );
          await manager.save(RolePermission, rps);
        }
      }

      return manager.findOne(Role, {
        where: { id: newRole.id },
        relations: { permissions: true },
      });
    });
  }

  async updateRole(
    id: number,
    clientId: number,
    data: { name?: string; description?: string; permissionIds?: number[] },
  ) {
    return this.dataSource.transaction(async (manager) => {
      const updateData: Partial<Role> = {};
      if (data.name) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (Object.keys(updateData).length) await manager.update(Role, id, updateData as any);

      if (data.permissionIds !== undefined) {
        await manager.delete(RolePermission, { roleId: id });

        if (data.permissionIds.length > 0) {
          const foundPermissions = await manager.find(Permission, {
            where: data.permissionIds.map((pid) => ({ id: pid })),
            select: { id: true },
          });

          if (foundPermissions.length > 0) {
            const rps = foundPermissions.map((p) =>
              manager.create(RolePermission, { roleId: id, permissionId: p.id }),
            );
            await manager.save(RolePermission, rps);
          }
        }
      }

      return manager.findOne(Role, {
        where: { id },
        relations: { permissions: true },
      });
    });
  }

  async deleteRole(id: number) {
    return this.roleRepo.delete(id);
  }
}
