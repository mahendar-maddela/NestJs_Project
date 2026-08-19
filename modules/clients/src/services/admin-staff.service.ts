import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AdminStaffRepository } from '../repositories/admin-staff.repository';
import { CreateStaffDto, UpdateStaffDto, StaffQueryDto } from '../dto/admin-staff.dto';
import { AwsService } from '@integrations/aws';
import { generateDummyPassword } from '@app/common';

function toArray(roleId?: number | number[]): number[] {
  if (roleId === undefined || roleId === null) return [];
  return Array.isArray(roleId) ? roleId : [roleId];
}

/** Mirrors `controllers/admin/staffController.js`. */
@Injectable()
export class AdminStaffService {
  constructor(
    private readonly repo: AdminStaffRepository,
    private readonly awsService: AwsService,
  ) {}

  async createStaff(clientId: number, dto: CreateStaffDto) {
    const existing = await this.repo.findByEmail(dto.email, clientId);
    if (existing) {
      throw new BadRequestException({ message: 'Email already exists' });
    }

    const dummyPassword = generateDummyPassword();
    const hashedPassword = await bcrypt.hash(dummyPassword, 10);

    const staffCount = await this.repo.count(clientId);

    const newStaff = await this.repo.create({
      first_name: dto.first_name,
      last_name: dto.last_name,
      email: dto.email,
      phone: dto.phone,
      aadhar: dto.aadhar,
      pan: dto.pan,
      password: hashedPassword,
      isTemp: true,
      clientId,
    });

    const prefixConfig = await this.repo.findPrefixConfig(clientId);
    const empId = `${prefixConfig?.employee ?? ''}${(staffCount + 1).toString().padStart(5, '0')}`;
    await this.repo.updateEmpId(newStaff.id, empId);

    const roleIds = toArray(dto.roleId);
    if (roleIds.length) {
      const roles = await this.repo.findRolesByIds(roleIds);
      await this.repo.addStaffRoles(
        newStaff.id,
        roles.map((r) => r.id),
      );
    }

    try {
      const clientDetails = await this.repo.findClientDetails(clientId);
      await this.awsService.sendEmail(
        newStaff.email as string,
        `Your ${clientDetails?.brandName || 'Account'} Has Been Created`,
        clientDetails?.brandName || 'Nexin',
        `<p>Hello ${newStaff.first_name || ''},</p><p>Your employee account has been created.</p><p>Login email: <strong>${newStaff.email}</strong></p><p>Temporary password: <strong>${dummyPassword}</strong></p>`,
      );
    } catch {
      // Email sending failure shouldn't fail staff creation, matches legacy's fire-and-forget pattern.
    }

    return { succes: true, message: 'Employee created successfully', data: newStaff };
  }

  async getAllStaff(clientId: number, query: StaffQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 200;
    const skip = (page - 1) * limit;

    const [rows, count] = await this.repo.findAndCountPaginated(
      clientId,
      process.env.SOFTWARELOGIN,
      query.search,
      query.status,
      skip,
      limit,
    );

    const staffRoles = await this.repo.findRolesForStaffIds(rows.map((r) => r.id));
    const rolesByStaff = new Map<number, { role: any; createdAt: Date }[]>();
    for (const sr of staffRoles) {
      if (!rolesByStaff.has(sr.staffId)) rolesByStaff.set(sr.staffId, []);
      rolesByStaff.get(sr.staffId)!.push({ role: sr.role, createdAt: sr.createdAt });
    }

    const modifiedRows = rows.map((staff) => {
      const roles = rolesByStaff.get(staff.id) || [];
      const latestRole = roles.length
        ? roles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].role
        : null;
      return { ...staff, role: latestRole };
    });

    return {
      success: true,
      message: 'Staff fetched successfully',
      data: modifiedRows,
      pagination: { totalPages: Math.ceil(count / limit), page },
    };
  }

  async getStaffById(id: number, clientId: number) {
    const result = await this.repo.findByIdWithRoles(id, clientId);
    if (!result) {
      throw new NotFoundException({ message: 'Staff not found' });
    }
    return { success: true, message: 'Staff fetched successfully', data: { ...result.staff, roles: result.roles } };
  }

  async updateStaff(id: number, clientId: number, dto: UpdateStaffDto) {
    const staff = await this.repo.findByIdAndClient(id, clientId);
    if (!staff) {
      throw new NotFoundException({ message: 'Staff not found' });
    }

    const { roleId, ...rest } = dto;
    const updated = await this.repo.update(id, rest);

    const roleIds = toArray(roleId);
    if (roleIds.length) {
      const roles = await this.repo.findRolesByIds(roleIds);
      await this.repo.replaceStaffRoles(
        id,
        roles.map((r) => r.id),
      );
    }

    return { success: true, message: 'Staff updated successfully', data: updated };
  }

  async deleteStaff(id: number, clientId: number) {
    const staff = await this.repo.findByIdAndClient(id, clientId);
    if (!staff) {
      throw new NotFoundException({ message: 'Staff not found' });
    }
    await this.repo.delete(id);
    return { success: true, message: 'Staff deleted successfully' };
  }
}
