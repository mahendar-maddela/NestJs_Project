import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Connector } from '../entities/connector.entity';

@Injectable()
export class AdminConnectorRepository {
  constructor(@InjectRepository(Connector) private readonly repo: Repository<Connector>) {}

  async create(data: Partial<Connector>) {
    return this.repo.save(this.repo.create(data));
  }

  async findAll() {
    return this.repo.find();
  }

  async findById(id: number) {
    return this.repo.findOne({ where: { id } });
  }

  async update(id: number, data: Partial<Connector>) {
    await this.repo.update(id, data as any);
    return this.findById(id);
  }

  async delete(id: number) {
    return this.repo.delete(id);
  }
}
