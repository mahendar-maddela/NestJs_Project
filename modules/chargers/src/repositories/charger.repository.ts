import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import { Charger } from '../entities/charger.entity';

@Injectable()
export class ChargerRepository {
  constructor(
    @InjectRepository(Charger)
    private readonly chargerRepo: Repository<Charger>,
  ) {}

  async findById(id: number) {
    return this.chargerRepo.findOne({ where: { id } });
  }

  async findBySerialNumber(chargerId: string) {
    return this.chargerRepo.findOne({ where: { chargerId } });
  }

  async findAll(params: { skip?: number; take?: number; where?: Record<string, unknown> }) {
    const options: FindManyOptions<Charger> = {};
    if (params.where) options.where = params.where as any;
    if (params.skip !== undefined) options.skip = params.skip;
    if (params.take !== undefined) options.take = params.take;
    return this.chargerRepo.find(options);
  }

  async create(data: Partial<Charger>) {
    return this.chargerRepo.save(this.chargerRepo.create(data));
  }

  async update(id: number, data: Partial<Charger>) {
    await this.chargerRepo.update(id, data as any);
    return this.chargerRepo.findOne({ where: { id } });
  }

  async delete(id: number) {
    return this.chargerRepo.delete(id);
  }
}
