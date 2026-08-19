import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import { FleetUser } from '../entities/fleet-user.entity';

@Injectable()
export class FleetRepository {
  constructor(
    @InjectRepository(FleetUser)
    private readonly fleetUserRepo: Repository<FleetUser>,
  ) {}

  async findById(id: number) {
    return this.fleetUserRepo.findOne({ where: { id } });
  }

  async findAll(params: { skip?: number; take?: number; where?: Record<string, unknown> }) {
    const options: FindManyOptions<FleetUser> = {};
    if (params.where) options.where = params.where as any;
    if (params.skip !== undefined) options.skip = params.skip;
    if (params.take !== undefined) options.take = params.take;
    return this.fleetUserRepo.find(options);
  }

  async create(data: Partial<FleetUser>) {
    return this.fleetUserRepo.save(this.fleetUserRepo.create(data));
  }
}
