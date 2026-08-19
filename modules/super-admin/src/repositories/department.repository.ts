import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SuperDepartment } from '../entities/super-department.entity';

@Injectable()
export class DepartmentRepository {
  constructor(
    @InjectRepository(SuperDepartment)
    private readonly departmentRepo: Repository<SuperDepartment>,
  ) {}

  async create(data: { name: string; superAdminId?: number }) {
    return this.departmentRepo.save(this.departmentRepo.create(data));
  }

  async findById(id: number) {
    return this.departmentRepo.findOne({ where: { id } });
  }

  async update(id: number, name: string) {
    await this.departmentRepo.update(id, { name });
    return this.departmentRepo.findOne({ where: { id } });
  }

  async count(where: Record<string, unknown>) {
    return this.departmentRepo.count({ where: where as any });
  }

  async findPaginated(where: Record<string, unknown>, skip: number, take: number) {
    const departments = await this.departmentRepo
      .createQueryBuilder('d')
      .leftJoin('d.superAdmins', 'sa')
      .select(['d.id', 'd.name', 'd.superAdminId', 'd.createdAt'])
      .addSelect('COUNT(sa.id)', 'employeeCount')
      .where(where)
      .groupBy('d.id')
      .skip(skip)
      .take(take)
      .orderBy('d.createdAt', 'DESC')
      .getRawAndEntities();

    return departments.entities.map((dept, i) => ({
      id: dept.id,
      name: dept.name,
      superAdminId: dept.superAdminId,
      createdAt: dept.createdAt,
      employeeCount: Number(departments.raw[i]?.employeeCount ?? 0),
    }));
  }
}
