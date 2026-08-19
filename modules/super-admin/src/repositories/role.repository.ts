import { Injectable } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { SuperRole } from '../entities/super-role.entity';
import { SuperPermission } from '../entities/super-permission.entity';
import { SuperRolePermission } from '../entities/super-role-permission.entity';

@Injectable()
export class RoleRepository {
  constructor(
    @InjectRepository(SuperRole)
    private readonly roleRepo: Repository<SuperRole>,
    @InjectRepository(SuperPermission)
    private readonly permissionRepo: Repository<SuperPermission>,
    @InjectRepository(SuperRolePermission)
    private readonly rolePermissionRepo: Repository<SuperRolePermission>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async findByNameAndSuperAdmin(name: string, superAdminId?: number) {
    const qb = this.roleRepo.createQueryBuilder('r').where('r.name = :name', { name });
    if (superAdminId) qb.andWhere('r.superAdminId = :superAdminId', { superAdminId });
    return qb.getRawOne();
  }

  async findById(id: number) {
    return this.roleRepo.findOne({
      where: { id },
      relations: { rolePermissions: { permission: true } },
    });
  }

  async createRoleWithPermissions(name: string, superAdminId?: number, permissionIds?: number[]) {
    return this.dataSource.transaction(async (manager) => {
      const newRole = await manager.save(SuperRole, manager.create(SuperRole, { name, superAdminId }));

      if (permissionIds && permissionIds.length > 0) {
        const validPermissions = await manager.find(SuperPermission, {
          where: permissionIds.map((id) => ({ id })),
        });

        if (validPermissions.length > 0) {
          const rps = validPermissions.map((p) =>
            manager.create(SuperRolePermission, { superRoleId: newRole.id, superPermissionId: p.id }),
          );
          await manager.save(SuperRolePermission, rps);
        }
      }

      return newRole;
    });
  }

  async updateRoleWithPermissions(id: number, name?: string, permissionIds?: number[]) {
    return this.dataSource.transaction(async (manager) => {
      if (name) await manager.update(SuperRole, id, { name });

      if (permissionIds !== undefined) {
        await manager.delete(SuperRolePermission, { superRoleId: id });

        if (permissionIds.length > 0) {
          const validPermissions = await manager.find(SuperPermission, {
            where: permissionIds.map((pid) => ({ id: pid })),
          });

          if (validPermissions.length > 0) {
            const rps = validPermissions.map((p) =>
              manager.create(SuperRolePermission, { superRoleId: id, superPermissionId: p.id }),
            );
            await manager.save(SuperRolePermission, rps);
          }
        }
      }

      return manager.findOne(SuperRole, { where: { id } });
    });
  }

  async delete(id: number) {
    return this.roleRepo.delete(id);
  }

  async count(where: Record<string, unknown>) {
    return this.roleRepo.count({ where: where as any });
  }

  async findPaginated(where: Record<string, unknown>, skip: number, take: number) {
    const roles = await this.roleRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.rolePermissions', 'rp')
      .leftJoin('r.superAdmins', 'sa')
      .addSelect(['sa.id'])
      .where(where)
      .skip(skip)
      .take(take)
      .orderBy('r.createdAt', 'DESC')
      .getMany();

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      permissionCount: role.rolePermissions?.length ?? 0,
      superAdminCount: (role as any).superAdmins?.length ?? 0,
      date: role.createdAt,
    }));
  }

  async findAllPermissions() {
    return this.permissionRepo.find();
  }
}
