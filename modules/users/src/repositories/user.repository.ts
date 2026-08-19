import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, FindManyOptions, Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { User } from '../entities/user.entity';

@Injectable()
export class UserRepository {
  constructor(@InjectRepository(User) private readonly userRepo: Repository<User>) {}

  async findByEmail(email: string) {
    return this.userRepo.findOne({ where: { email } });
  }

  async findById(id: number) {
    return this.userRepo.findOne({ where: { id } });
  }

  async findByPhone(phone: string) {
    return this.userRepo.findOne({ where: { phone } });
  }

  async findAll(params: FindManyOptions<User>) {
    return this.userRepo.find(params);
  }

  async create(data: DeepPartial<User>) {
    return this.userRepo.save(this.userRepo.create(data));
  }

  async update(id: number, data: DeepPartial<User>) {
    await this.userRepo.update({ id }, data as QueryDeepPartialEntity<User>);
    return this.userRepo.findOne({ where: { id } });
  }

  async delete(id: number) {
    return this.userRepo.delete({ id });
  }
}
