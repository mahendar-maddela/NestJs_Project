import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientFeature } from '../entities/client-feature.entity';
import { ClientFeatureMapping } from '../entities/client-feature-mapping.entity';
import { Permission } from '../entities/permission.entity';

@Injectable()
export class AdminPermissionRepository {
  constructor(
    @InjectRepository(ClientFeature)
    private readonly clientFeatureRepo: Repository<ClientFeature>,
    @InjectRepository(ClientFeatureMapping)
    private readonly clientFeatureMappingRepo: Repository<ClientFeatureMapping>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
  ) {}

  async findFeaturesByNames(names: string[]) {
    if (!names.length) return [];
    return this.clientFeatureRepo
      .createQueryBuilder('cf')
      .select(['cf.id', 'cf.name'])
      .where('cf.name IN (:...names)', { names })
      .getMany();
  }

  async findClientFeatureMappings(clientId: number, featureIds: number[]) {
    if (!featureIds.length) return [];
    return this.clientFeatureMappingRepo
      .createQueryBuilder('cfm')
      .select(['cfm.featureId'])
      .where('cfm.clientId = :clientId AND cfm.featureId IN (:...featureIds)', {
        clientId,
        featureIds,
      })
      .getMany();
  }

  async findStaffPermissionsExcluding(excludeNames: string[]) {
    const qb = this.permissionRepo
      .createQueryBuilder('p')
      .where('p.type = :type', { type: 'staff' });

    if (excludeNames.length > 0) {
      qb.andWhere('p.name NOT IN (:...excludeNames)', { excludeNames });
    }

    return qb.getMany();
  }

  async create(data: Partial<Permission>) {
    return this.permissionRepo.save(this.permissionRepo.create(data));
  }

  async findById(id: number) {
    return this.permissionRepo.findOne({ where: { id } });
  }

  async update(id: number, data: Partial<Permission>) {
    await this.permissionRepo.update(id, data as any);
    return this.findById(id);
  }

  async delete(id: number) {
    return this.permissionRepo.delete(id);
  }
}
