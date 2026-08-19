import { Injectable, NotFoundException } from '@nestjs/common';
import { DepartmentRepository } from '../repositories/department.repository';
import { CreateDepartmentDto, UpdateDepartmentDto, DepartmentQueryDto } from '../dto/department.dto';

@Injectable()
export class DepartmentService {
  constructor(private readonly departmentRepository: DepartmentRepository) {}

  async createDepartment(dto: CreateDepartmentDto, superAdminId?: number) {
    const department = await this.departmentRepository.create({
      name: dto.name,
      superAdminId,
    });

    return {
      success: true,
      data: department,
      message: 'Department Created SuccessFully',
    };
  }

  async getAllDepartments(query: DepartmentQueryDto) {
    const pageNum = Math.max(Number(query.page) || 1, 1);
    const limitNum = Math.max(Number(query.limit) || 10, 1);
    const skip = (pageNum - 1) * limitNum;
    const search = query.search?.trim() || '';

    const where: any = search
      ? { name: { contains: search } }
      : {};

    const [count, rows] = await Promise.all([
      this.departmentRepository.count(where),
      this.departmentRepository.findPaginated(where, skip, limitNum),
    ]);

    return {
      success: true,
      message: 'Departments fetched successfully',
      data: rows,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum),
      },
    };
  }

  async getByIdDepartment(id: number) {
    const department = await this.departmentRepository.findById(id);
    if (!department) {
      throw new NotFoundException({ success: false, message: 'Department Not found' });
    }

    return {
      success: true,
      data: department,
      message: 'SucessFully Fetched',
    };
  }

  async updateDepartment(id: number, dto: UpdateDepartmentDto) {
    const department = await this.departmentRepository.findById(id);
    if (!department) {
      throw new NotFoundException({ success: false, message: 'Department Not found' });
    }

    const updated = await this.departmentRepository.update(id, dto.name);

    return {
      success: true,
      message: 'Department updated successfully',
      data: updated,
    };
  }
}
