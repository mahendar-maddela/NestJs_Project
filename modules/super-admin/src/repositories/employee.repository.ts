import { Injectable } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { SuperAdmin } from '../entities/super-admin.entity';

@Injectable()
export class EmployeeRepository {
  constructor(
    @InjectRepository(SuperAdmin)
    private readonly superAdminRepo: Repository<SuperAdmin>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async findByEmailOrEmpId(email: string, empId: string) {
    return this.superAdminRepo
      .createQueryBuilder('sa')
      .where('sa.email = :email OR sa.empId = :empId', { email, empId })
      .getRawOne();
  }

  async findById(id: number) {
    return this.superAdminRepo
      .createQueryBuilder('sa')
      .leftJoinAndSelect('sa.role', 'role')
      .leftJoinAndSelect('sa.department', 'department')
      .where('sa.id = :id', { id })
      .getRawOne();
  }

  async create(data: Partial<SuperAdmin>) {
    const entity = this.superAdminRepo.create(data);
    const saved = await this.superAdminRepo.save(entity);
    return this.findById(saved.id);
  }

  async update(id: number, data: Partial<SuperAdmin>) {
    await this.superAdminRepo.update(id, data);
    return this.findById(id);
  }

  async findAllSimple(search?: string) {
    const qb = this.superAdminRepo
      .createQueryBuilder('sa')
      .select(['sa.id', 'sa.empId', 'sa.name'])
      .orderBy('sa.createdAt', 'DESC');

    if (search) {
      qb.where('sa.name LIKE :search OR sa.empId LIKE :search', {
        search: `%${search}%`,
      });
    }

    return qb.getMany();
  }

  async count(where: Record<string, unknown>) {
    return this.superAdminRepo.count({ where: where as any });
  }

  async findPaginated(where: Record<string, unknown>, skip: number, take: number) {
    return this.superAdminRepo
      .createQueryBuilder('sa')
      .leftJoinAndSelect('sa.role', 'role')
      .leftJoinAndSelect('sa.department', 'department')
      .where(where)
      .skip(skip)
      .take(take)
      .orderBy('sa.createdAt', 'DESC')
      .getMany();
  }
}
