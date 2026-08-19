import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VendorType } from '../entities/vendor-type.entity';

@Injectable()
export class AdminVendorTypeRepository {
  constructor(@InjectRepository(VendorType) private readonly repo: Repository<VendorType>) {}

  async create(data: Partial<VendorType>) {
    return this.repo.save(this.repo.create(data));
  }

  async findAll() {
    return this.repo.find();
  }

  async findById(id: number) {
    return this.repo.findOne({ where: { id } });
  }

  async update(id: number, data: Partial<VendorType>) {
    await this.repo.update(id, data);
    return this.findById(id);
  }

  async delete(id: number) {
    return this.repo.delete(id);
  }
}
