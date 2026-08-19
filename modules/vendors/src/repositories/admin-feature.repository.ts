import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, In, Repository } from 'typeorm';
import { Feature } from '../entities/feature.entity';
import { ClientFeature } from '../../../clients/src/entities/client-feature.entity';
import { ClientFeatureMapping } from '../../../clients/src/entities/client-feature-mapping.entity';

@Injectable()
export class AdminFeatureRepository {
  constructor(
    @InjectRepository(Feature) private readonly featureRepo: Repository<Feature>,
    @InjectRepository(ClientFeature) private readonly clientFeatureRepo: Repository<ClientFeature>,
    @InjectRepository(ClientFeatureMapping) private readonly clientFeatureMappingRepo: Repository<ClientFeatureMapping>,
  ) {}

  async create(data: Partial<Feature>) {
    return this.featureRepo.save(this.featureRepo.create(data));
  }

  async findById(id: number) {
    return this.featureRepo.findOne({ where: { id } });
  }

  async update(id: number, data: Partial<Feature>) {
    await this.featureRepo.update(id, data);
    return this.findById(id);
  }

  async delete(id: number) {
    return this.featureRepo.delete(id);
  }

  async findFeaturesByNames(names: string[]) {
    if (!names.length) return [];
    return this.clientFeatureRepo.createQueryBuilder('cf').select(['cf.id', 'cf.name']).where('cf.name IN (:...names)', { names }).getMany();
  }

  async findEnabledFeatureIds(clientId: number, featureIds: number[]) {
    if (!featureIds.length) return [];
    const rows = await this.clientFeatureMappingRepo
      .createQueryBuilder('cfm')
      .select(['cfm.featureId'])
      .where('cfm.clientId = :clientId AND cfm.featureId IN (:...featureIds)', { clientId, featureIds })
      .getMany();
    return rows.map((r) => r.featureId);
  }

  async findAllExcluding(excludeNames: string[]) {
    if (!excludeNames.length) return this.featureRepo.find();
    return this.featureRepo.find({ where: { name: Not(In(excludeNames)) } });
  }
}
