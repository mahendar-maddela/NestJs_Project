import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { EmployeeRepository } from '../repositories/employee.repository';
import { CreateEmployeeDto, UpdateEmployeeDto, EmployeeQueryDto } from '../dto/employee.dto';
import { AwsService } from '@integrations/aws';
import { generateDummyPassword } from '@app/common';

@Injectable()
export class EmployeeService {
  constructor(
    private readonly employeeRepository: EmployeeRepository,
    private readonly awsService: AwsService,
  ) {}

  async createEmployee(dto: CreateEmployeeDto) {
    const { name, email, phone, roleId, departId, empId } = dto;

    const existingEmployee = await this.employeeRepository.findByEmailOrEmpId(email, empId);
    if (existingEmployee) {
      const message =
        existingEmployee.email === email
          ? 'Employee with this email already exists'
          : 'Employee ID already exists';
      throw new ConflictException({ success: false, message });
    }

    const dummyPassword = generateDummyPassword();
    const hashedPassword = await bcrypt.hash(dummyPassword, 10);

    const employee = await this.employeeRepository.create({
      name,
      email,
      phone,
      empId,
      password: hashedPassword,
      isActive: true,
      roleId,
      departId,
    });

    try {
      await this.awsService.sendEmail(
        email,
        'Your Account Credentials',
        'Nexin',
        `<p>Hello ${name},</p><p>Your account has been created. Password: <strong>${dummyPassword}</strong></p>`,
      );
    } catch {
      // Email sending failure shouldn't fail creation
    }

    return {
      success: true,
      message: 'Employee created successfully',
      data: employee,
    };
  }

  async getAllEmployees(query: EmployeeQueryDto) {
    const { search, page, limit } = query;

    const hasPagination = page !== undefined || limit !== undefined;

    if (!hasPagination) {
      const employees = await this.employeeRepository.findAllSimple(search?.trim());
      return {
        success: true,
        message: 'Employees fetched successfully',
        data: employees,
      };
    }

    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.max(Number(limit) || 10, 1);
    const skip = (pageNum - 1) * limitNum;

    const where: any = search
      ? {
          OR: [
            { name: { contains: search.trim() } },
            { empId: { contains: search.trim() } },
          ],
        }
      : {};

    const [count, employees] = await Promise.all([
      this.employeeRepository.count(where),
      this.employeeRepository.findPaginated(where, skip, limitNum),
    ]);

    return {
      success: true,
      message: 'Employees fetched successfully',
      data: employees,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum),
      },
    };
  }

  async getEmployeeById(id: number) {
    const employee = await this.employeeRepository.findById(id);
    if (!employee) {
      throw new NotFoundException({ success: false, message: 'Employee not found' });
    }

    const { password, ...result } = employee as any;

    return {
      success: true,
      data: result,
      message: 'SuccessFully Fetched',
    };
  }

  async updateEmployee(id: number, dto: UpdateEmployeeDto) {
    const employee = await this.employeeRepository.findById(id);
    if (!employee) {
      throw new NotFoundException({ success: false, message: 'Employee not found' });
    }

    const updated = await this.employeeRepository.update(id, dto);

    return {
      success: true,
      message: 'Employee updated successfully',
      data: updated,
    };
  }
}
