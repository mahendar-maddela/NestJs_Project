import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { Vendor } from '../entities/vendor.entity';
import { VendorRole } from '../entities/vendor-role.entity';
import { Role } from '../../../clients/src/entities/role.entity';
import { Permission } from '../../../clients/src/entities/permission.entity';
import { IndividualPermission } from '../../../clients/src/entities/individual-permission.entity';

@Injectable()
export class VendorEmployeeRepository {
  constructor(
    @InjectRepository(Vendor) private readonly vendorRepo: Repository<Vendor>,
    @InjectRepository(VendorRole) private readonly vendorRoleRepo: Repository<VendorRole>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission) private readonly permissionRepo: Repository<Permission>,
    @InjectRepository(IndividualPermission) private readonly individualPermissionRepo: Repository<IndividualPermission>,
  ) {}

  findByEmail(email: string) {
    return this.vendorRepo.findOne({ where: { email } });
  }

  findById(id: number) {
    return this.vendorRepo.findOne({ where: { id } });
  }

  /** Scoped to clientId — legacy's PK-only lookup allows cross-tenant reads, which CLAUDE.md forbids. */
  findByIdAndClient(id: number, clientId: number) {
    return this.vendorRepo.findOne({ where: { id, clientId }, select: { id: true, vendor_name: true, email: true, phone: true } });
  }

  countByParentVendor(parentVendorId: number) {
    return this.vendorRepo.count({ where: { parentVendorId } });
  }

  createEmployee(data: Partial<Vendor>) {
    return this.vendorRepo.save(this.vendorRepo.create(data));
  }

  createVendorRole(vendorId: number, roleId: number) {
    return this.vendorRoleRepo.save(this.vendorRoleRepo.create({ vendorId, roleId }));
  }

  async deleteVendorRoles(vendorId: number) {
    await this.vendorRoleRepo.delete({ vendorId });
  }

  async findEmployeesByParentVendor(parentVendorId: number) {
    const employees = await this.vendorRepo.find({
      where: { parentVendorId },
      select: {
        id: true, vendor_name: true, community_name: true, phone: true, email: true, vendorTypeId: true,
        vendorUniqueId: true, pan: true, gst: true, noOfStations: true, noOfEmployees: true, noOfUsers: true,
        staffId: true, isTemp: true, status: true, parentVendorId: true, transFeePerc: true, twoFaEnabled: true,
        location: true, clientId: true, createdAt: true, updatedAt: true,
      },
    });

    const vendorIds = employees.map((e) => e.id);
    const rolesByVendor = await this.findRoleNamesByVendorIds(vendorIds);

    return employees.map((e) => ({ ...e, roles: rolesByVendor.get(e.id) ?? [] }));
  }

  async findRoleNamesByVendorIds(vendorIds: number[]): Promise<Map<number, { name: string }[]>> {
    const map = new Map<number, { name: string }[]>();
    if (!vendorIds.length) return map;

    const rows = await this.vendorRoleRepo
      .createQueryBuilder('vr')
      .innerJoin(Role, 'role', 'role.id = vr.roleId')
      .select(['vr.vendorId AS vendorId', 'role.name AS name'])
      .where('vr.vendorId IN (:...vendorIds)', { vendorIds })
      .getRawMany<{ vendorId: number; name: string }>();

    for (const row of rows) {
      if (!map.has(row.vendorId)) map.set(row.vendorId, []);
      map.get(row.vendorId)!.push({ name: row.name });
    }
    return map;
  }

  async findRolesByVendorId(vendorId: number): Promise<{ id: number; name: string }[]> {
    const rows = await this.vendorRoleRepo
      .createQueryBuilder('vr')
      .innerJoin(Role, 'role', 'role.id = vr.roleId')
      .select(['role.id AS id', 'role.name AS name'])
      .where('vr.vendorId = :vendorId', { vendorId })
      .getRawMany<{ id: number; name: string }>();
    return rows;
  }

  async updateEmployee(id: number, clientId: number, data: Partial<Vendor>) {
    await this.vendorRepo.update({ id, clientId }, data as any);
    return this.vendorRepo.findOne({ where: { id } });
  }

  async deleteEmployee(id: number, clientId: number) {
    await this.vendorRepo.delete({ id, clientId });
  }

  findPermissionsByIds(ids: number[]) {
    if (!ids.length) return Promise.resolve([]);
    return this.permissionRepo.find({ where: { id: In(ids) } });
  }

  async replaceIndividualPermissions(vendorId: number, permissionIds: number[]) {
    await this.individualPermissionRepo.delete({ vendorId });
    if (permissionIds.length) {
      await this.individualPermissionRepo.save(permissionIds.map((permissionId) => this.individualPermissionRepo.create({ vendorId, permissionId })));
    }
  }

  async findIndividualPermissionNames(vendorId: number): Promise<{ id: number; name: string }[]> {
    const rows = await this.individualPermissionRepo
      .createQueryBuilder('ip')
      .innerJoin(Permission, 'permission', 'permission.id = ip.permissionId')
      .select(['permission.id AS id', 'permission.name AS name'])
      .where('ip.vendorId = :vendorId', { vendorId })
      .getRawMany<{ id: number; name: string }>();
    return rows;
  }

  async findRolePermissionNames(vendorId: number): Promise<{ id: number; name: string }[]> {
    const roles = await this.findRolesByVendorId(vendorId);
    if (!roles.length) return [];

    const rows = await this.vendorRoleRepo.manager
      .createQueryBuilder()
      .select(['permission.id AS id', 'permission.name AS name'])
      .from('Role_Permissions', 'rp')
      .innerJoin(Permission, 'permission', 'permission.id = rp.permissionId')
      .where('rp.roleId IN (:...roleIds)', { roleIds: roles.map((r) => r.id) })
      .andWhere('permission.type = :type', { type: 'vendor' })
      .getRawMany<{ id: number; name: string }>();
    return rows;
  }

  findAllVendorPermissions(excludeNames: string[]) {
    return this.permissionRepo.find({
      where: { type: 'vendor', ...(excludeNames.length ? { name: Not(In(excludeNames)) } : {}) },
      select: { id: true, name: true },
    });
  }
}
