import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { RfidTag } from '../entities/rfid-tag.entity';

@Injectable()
export class AdminRfidTagRepository {
  constructor(@InjectRepository(RfidTag) private readonly repo: Repository<RfidTag>) {}

  async findByTag(rfIdTag: string) {
    return this.repo.findOne({ where: { rfIdTag } });
  }

  async create(data: Partial<RfidTag>) {
    return this.repo.save(this.repo.create(data));
  }

  async findByIdAndClient(id: number, clientId: number) {
    return this.repo.findOne({ where: { id, clientId } });
  }

  async findByIdAndClientWithUser(id: number, clientId: number) {
    return this.repo.findOne({ where: { id, clientId }, relations: { user: true } });
  }

  async update(id: number, data: QueryDeepPartialEntity<RfidTag>) {
    await this.repo.update(id, data);
    return this.repo.findOne({ where: { id } });
  }

  async delete(id: number) {
    return this.repo.delete(id);
  }

  async findAndCountPaginated(clientId: number, search: string | undefined, skip: number, take: number) {
    const qb = this.repo
      .createQueryBuilder('rfid')
      .leftJoinAndSelect('rfid.user', 'user')
      .leftJoinAndSelect('rfid.fleet', 'fleet')
      .where('rfid.clientId = :clientId', { clientId });

    if (search) {
      const s = `%${search}%`;
      qb.andWhere(
        '(rfid.rfIdTag LIKE :s OR user.userId LIKE :s OR user.first_name LIKE :s OR fleet.fleetUId LIKE :s OR fleet.cName LIKE :s)',
        { s },
      );
    }

    qb.orderBy('rfid.createdAt', 'DESC').skip(skip).take(take);
    return qb.getManyAndCount();
  }
}
