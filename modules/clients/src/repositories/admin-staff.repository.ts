import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Like, Not, Repository } from 'typeorm';
import { Staff } from '../entities/staff.entity';
import { StaffRole } from '../entities/staff-role.entity';
import { Role } from '../entities/role.entity';
import { PrefixConfig } from '../entities/prefix-config.entity';
import { ClientDetails } from '../entities/client-details.entity';

@Injectable()
export class AdminStaffRepository {
  constructor(
    @InjectRepository(Staff) private readonly staffRepo: Repository<Staff>,
    @InjectRepository(StaffRole) private readonly staffRoleRepo: Repository<StaffRole>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(PrefixConfig) private readonly prefixConfigRepo: Repository<PrefixConfig>,
    @InjectRepository(ClientDetails) private readonly clientDetailsRepo: Repository<ClientDetails>,
  ) {}

  async findByEmail(email: string, clientId: number) {
    return this.staffRepo.findOne({ where: { email, clientId }, select: { id: true, email: true } });
  }

  async create(data: Partial<Staff>) {
    return this.staffRepo.save(this.staffRepo.create(data));
  }

  async count(clientId: number) {
    return this.staffRepo.count({ where: { clientId } });
  }

  async findPrefixConfig(clientId: number) {
    return this.prefixConfigRepo.findOne({ where: { clientId } });
  }

  async updateEmpId(id: number, empId: string) {
    await this.staffRepo.update(id, { empId });
  }

  async findRolesByIds(roleIds: number[]) {
    if (!roleIds.length) return [];
    return this.roleRepo.find({ where: { id: In(roleIds) } });
  }

  async addStaffRoles(staffId: number, roleIds: number[]) {
    if (!roleIds.length) return;
    await this.staffRoleRepo.save(roleIds.map((roleId) => this.staffRoleRepo.create({ staffId, roleId })));
  }

  async replaceStaffRoles(staffId: number, roleIds: number[]) {
    await this.staffRoleRepo.delete({ staffId });
    await this.addStaffRoles(staffId, roleIds);
  }

  async findClientDetails(clientId: number) {
    return this.clientDetailsRepo.findOne({ where: { clientId } });
  }

  async findAndCountPaginated(
    clientId: number,
    softwareLoginEmail: string | undefined,
    search: string | undefined,
    status: string | undefined,
    skip: number,
    take: number,
  ) {
    const baseWhere: any = { clientId };
    if (softwareLoginEmail) baseWhere.email = Not(softwareLoginEmail);
    if (status) baseWhere.status = status;

    const where = search
      ? [
          { ...baseWhere, first_name: Like(`%${search}%`) },
          { ...baseWhere, last_name: Like(`%${search}%`) },
          { ...baseWhere, email: Like(`%${search}%`) },
          { ...baseWhere, empId: Like(`%${search}%`) },
          { ...baseWhere, phone: Like(`%${search}%`) },
        ]
      : baseWhere;

    return this.staffRepo.findAndCount({ where, order: { createdAt: 'DESC' }, skip, take });
  }

  async findRolesForStaffIds(staffIds: number[]) {
    if (!staffIds.length) return [];
    return this.staffRoleRepo.find({ where: { staffId: In(staffIds) }, relations: { role: true } });
  }

  async findByIdAndClient(id: number, clientId: number) {
    return this.staffRepo.findOne({ where: { id, clientId } });
  }

  async findByIdWithRoles(id: number, clientId: number) {
    const staff = await this.staffRepo.findOne({ where: { id, clientId } });
    if (!staff) return null;
    const staffRoles = await this.staffRoleRepo.find({ where: { staffId: id }, relations: { role: true } });
    return { staff, roles: staffRoles.map((sr) => sr.role) };
  }

  async update(id: number, data: Partial<Staff>) {
    await this.staffRepo.update(id, data as any);
    return this.staffRepo.findOne({ where: { id } });
  }

  async delete(id: number) {
    return this.staffRepo.delete(id);
  }
}
