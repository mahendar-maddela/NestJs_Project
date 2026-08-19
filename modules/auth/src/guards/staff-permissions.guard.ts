import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Staff } from '../../../clients/src/entities/staff.entity';
import { StaffRole } from '../../../clients/src/entities/staff-role.entity';
import { RolePermission } from '../../../clients/src/entities/role-permission.entity';
import { STAFF_PERMISSION_KEY } from '../decorators/staff-permission.decorator';

@Injectable()
export class StaffPermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(Staff) private readonly staffRepo: Repository<Staff>,
    @InjectRepository(StaffRole) private readonly staffRoleRepo: Repository<StaffRole>,
    @InjectRepository(RolePermission) private readonly rolePermissionRepo: Repository<RolePermission>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<string>(STAFF_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermission) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const staff = req.user || req.staff;

    if (!staff || !staff.id) {
      throw new ForbiddenException({
        success: false,
        message: 'Forbidden resource: Staff context missing',
      });
    }

    const dbStaff = await this.staffRepo.findOne({
      where: { id: Number(staff.id) },
      relations: { individualPermissions: { permission: true } },
    });

    if (!dbStaff) {
      throw new ForbiddenException({
        success: false,
        message: 'Forbidden resource: Staff not found',
      });
    }

    // Staff <-> Role is many-to-many via Staff_Roles; aggregate permissions across every role assigned.
    const staffRoles = await this.staffRoleRepo.find({ where: { staffId: dbStaff.id } });
    const roleIds = staffRoles.map((sr) => sr.roleId);
    const rolePermissionRows = roleIds.length
      ? await this.rolePermissionRepo.find({ where: { roleId: In(roleIds) }, relations: { permission: true } })
      : [];

    const rolePermissions = rolePermissionRows.map((rp) => rp.permission.name);
    const indPermissions = dbStaff.individualPermissions?.map((ip) => ip.permission?.name).filter((name): name is string => Boolean(name)) || [];
    const allPermissions = new Set([...rolePermissions, ...indPermissions]);

    if (allPermissions.has(requiredPermission) || allPermissions.has('ALL') || Boolean(dbStaff.superAdminId)) {
      return true;
    }

    throw new ForbiddenException({
      success: false,
      message: `Access denied. Required permission: ${requiredPermission}`,
    });
  }
}
