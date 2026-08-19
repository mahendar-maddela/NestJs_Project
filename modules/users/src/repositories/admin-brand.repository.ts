import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from '../entities/brand.entity';

@Injectable()
export class AdminBrandRepository {
  constructor(@InjectRepository(Brand) private readonly brandRepo: Repository<Brand>) {}

  async findByName(name: string) {
    return this.brandRepo.findOne({ where: { name } });
  }

  async create(name: string) {
    return this.brandRepo.save(this.brandRepo.create({ name }));
  }

  async findAll() {
    return this.brandRepo.find();
  }

  async findByIdWithModels(id: number) {
    return this.brandRepo.findOne({
      where: { id },
      relations: { models: true },
    });
  }

  async findById(id: number) {
    return this.brandRepo.findOne({ where: { id } });
  }

  async update(id: number, name: string) {
    await this.brandRepo.update(id, { name });
    return this.findById(id);
  }

  async delete(id: number) {
    return this.brandRepo.delete(id);
  }
}
