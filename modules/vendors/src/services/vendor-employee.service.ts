import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AwsService } from '@integrations/aws';
import { VendorEmployeeRepository } from '../repositories/vendor-employee.repository';
import { CreateVendorEmployeeDto, UpdateVendorEmployeeDto, AssignIndividualPermissionsDto } from '../dto/vendor-employee.dto';

function buildPasswordCreationEmailHtml(password: string): string {
  return `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #333;">
      <h2>Welcome to Nexinev</h2>
      <p>Your vendor employee account has been created. Use the temporary password below to log in:</p>
      <p style="font-size: 18px;"><strong>${password}</strong></p>
      <p>Please change your password after your first login.</p>
    </div>
  `;
}

/** Mirrors `controllers/vendors/employeeController.js`. */
@Injectable()
export class VendorEmployeeService {
  constructor(
    private readonly repo: VendorEmployeeRepository,
    private readonly awsService: AwsService,
  ) {}

  async createEmployee(vendorId: number, clientId: number, dto: CreateVendorEmployeeDto) {
    const { roleId, ...rest } = dto;

    const existingEmployee = await this.repo.findByEmail(dto.email);
    if (existingEmployee) {
      throw new BadRequestException({ message: 'Employee already exists' });
    }

    const vendor = await this.repo.findById(vendorId);
    if (!vendor) {
      throw new NotFoundException({ message: 'Vendor not found' });
    }

    const vendorEmployeeCount = await this.repo.countByParentVendor(vendorId);
    if (vendor.noOfEmployees !== null && vendorEmployeeCount >= vendor.noOfEmployees) {
      throw new BadRequestException({ message: 'Maximum number of employees reached' });
    }

    const dummyPassword = '@54321';
    const hashedPassword = await bcrypt.hash(dummyPassword, 10);

    const newEmployee = await this.repo.createEmployee({
      ...(rest as Partial<import('../entities/vendor.entity').Vendor>),
      password: hashedPassword,
      parentVendorId: vendorId,
      clientId,
    });

    if (roleId) {
      await this.repo.createVendorRole(newEmployee.id, roleId);
    }

    if (newEmployee.email) {
      this.awsService
        .sendEmail(newEmployee.email, 'Create Your Password - Welcome to Nexinev', 'Nexinev', buildPasswordCreationEmailHtml(dummyPassword))
        .catch((err) => console.error('Mail failed:', err.message));
    }

    return { success: true, message: 'Employee created successfully', data: newEmployee };
  }

  async getAllEmployees(vendorId: number) {
    const vendor = await this.repo.findEmployeesByParentVendor(vendorId);
    return { success: true, message: 'Employee-vendors fetched successfully', data: vendor };
  }

  async getEmployeeById(id: number, clientId: number) {
    const employee = await this.repo.findByIdAndClient(id, clientId);
    if (!employee) {
      throw new NotFoundException({ message: 'Employee not found' });
    }

    const roles = await this.repo.findRolesByVendorId(id);
    return { success: true, message: 'Employee fetched successfully', data: { ...employee, roles } };
  }

  async updateEmployee(id: number, clientId: number, dto: UpdateVendorEmployeeDto) {
    const employee = await this.repo.findByIdAndClient(id, clientId);
    if (!employee) {
      throw new NotFoundException({ message: 'Employee not found' });
    }

    const { roleId, ...rest } = dto;
    const updated = await this.repo.updateEmployee(id, clientId, rest as any);

    await this.repo.deleteVendorRoles(id);
    if (roleId) {
      await this.repo.createVendorRole(id, roleId);
    }

    return { success: true, message: 'Employee updated successfully', data: updated };
  }

  async deleteEmployee(id: number, clientId: number) {
    const employee = await this.repo.findByIdAndClient(id, clientId);
    if (!employee) {
      throw new NotFoundException({ message: 'Employee not found' });
    }
    await this.repo.deleteEmployee(id, clientId);
    return { success: true, message: 'Employee deleted successfully' };
  }

  async individualPermissionsToUser(id: number, dto: AssignIndividualPermissionsDto) {
    const employee = await this.repo.findById(id);
    if (!employee) {
      throw new NotFoundException({ message: 'Employee not found' });
    }

    const foundPermissions = await this.repo.findPermissionsByIds(dto.permissionIds);
    await this.repo.replaceIndividualPermissions(id, foundPermissions.map((p) => p.id));

    return { success: true, message: 'Permissions assigned successfully', data: foundPermissions };
  }

  async getAllVendorPermissions(vendorId: number) {
    const vendor = await this.repo.findById(vendorId);
    if (!vendor) {
      throw new NotFoundException({ success: false, message: 'Vendor not found' });
    }

    const [rolePermissions, vendorPermissions] = await Promise.all([
      this.repo.findRolePermissionNames(vendorId),
      this.repo.findIndividualPermissionNames(vendorId),
    ]);

    // Legacy wraps this concatenation in `new Set()`, which is a no-op for arrays of object
    // literals (Set dedupes by reference) — preserved as a plain concat, not a real dedup.
    const assignedPermissions = [...rolePermissions, ...vendorPermissions];

    const notAssignedPermissions = await this.repo.findAllVendorPermissions(assignedPermissions.map((p) => p.name));

    return {
      success: true,
      message: 'Employee permissions fetched successfully',
      data: { vendor, assignedPermissions, notAssignedPermissions, vendorPermissions, rolePermissions },
    };
  }
}
