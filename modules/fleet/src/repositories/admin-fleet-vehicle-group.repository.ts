import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FleetVehicleGroup } from '../entities/fleet-vehicle-group.entity';
import { FleetUserDetail } from '../entities/fleet-user-detail.entity';
import { PrefixConfig } from '../../../clients/src/entities/prefix-config.entity';

@Injectable()
export class AdminFleetVehicleGroupRepository {
  constructor(
    @InjectRepository(FleetVehicleGroup) private readonly groupRepo: Repository<FleetVehicleGroup>,
    @InjectRepository(FleetUserDetail) private readonly fleetUserDetailRepo: Repository<FleetUserDetail>,
    @InjectRepository(PrefixConfig) private readonly prefixConfigRepo: Repository<PrefixConfig>,
  ) {}

  findByNameFleetVendor(name: string, fleetId: number, vendorId: number) {
    return this.groupRepo.findOne({ where: { name, fleetId, vendorId } });
  }

  // Legacy has no tenant scope at all on this lookup (`FleetUserDetail.findOne({where:{id}})`) —
  // scoped here by vendorId to prevent a vendor from creating groups against another tenant's fleet.
  findFleetByIdAndVendor(id: number, vendorId: number) {
    return this.fleetUserDetailRepo.findOne({ where: { id, vendorId }, select: { id: true, noOfGroups: true } });
  }

  findGroupsByFleetAndVendor(fleetId: number, vendorId: number) {
    return this.groupRepo.find({
      where: { fleetId, vendorId },
      relations: { vehicles: true, rfidTags: true },
    });
  }

  // Legacy scopes the top-level lookup by `{id, clientId}` only (no vendorId) — scoped here by
  // vendorId too, matching the sibling list/create endpoints' own vendor scoping. The nested
  // `vendorUserTypes` include filters by vendorId in its ON clause (`required: false`), which
  // TypeORM's plain `relations` option can't express, hence the explicit joins below.
  findByIdAndVendorClientWithNested(id: number, vendorId: number, clientId: number) {
    return this.groupRepo
      .createQueryBuilder('g')
      .leftJoinAndSelect('g.vehicles', 'vehicles')
      .leftJoinAndSelect('g.rfidTags', 'rfidTags')
      .leftJoinAndSelect('g.vendorUserTypes', 'vendorUserTypes', 'vendorUserTypes.vendorId = :vendorId', { vendorId })
      .leftJoinAndSelect('vendorUserTypes.userType', 'userType')
      .leftJoinAndSelect('userType.tariffs', 'tariffs')
      .where('g.id = :id', { id })
      .andWhere('g.vendorId = :vendorId', { vendorId })
      .andWhere('g.clientId = :clientId', { clientId })
      .getRawOne();
  }

  // Legacy has no tenant scope at all on this lookup — scoped here by vendorId.
  findByIdAndVendorWithVehicles(id: number, vendorId: number) {
    return this.groupRepo.findOne({ where: { id, vendorId }, relations: { vehicles: true } });
  }

  findByNameFleetClient(name: string, fleetId: number, clientId: number) {
    return this.groupRepo.findOne({ where: { name, fleetId, clientId } });
  }

  findFleetByIdAndClient(id: number, clientId: number) {
    return this.fleetUserDetailRepo.findOne({ where: { id, clientId }, select: { id: true, noOfGroups: true } });
  }

  countGroupsByFleet(fleetId: number, clientId: number) {
    return this.groupRepo.count({ where: { fleetId, clientId } });
  }

  countGroupsByClient(clientId: number) {
    return this.groupRepo.count({ where: { clientId } });
  }

  createGroup(data: Partial<FleetVehicleGroup>) {
    return this.groupRepo.save(this.groupRepo.create(data));
  }

  async updateGroupId(id: number, groupId: string) {
    await this.groupRepo.update(id, { groupId });
  }

  findPrefixConfig(clientId: number) {
    return this.prefixConfigRepo.findOne({ where: { clientId }, select: { id: true, clientId: true, vehicleGroup: true } });
  }

  findGroupsByFleetAndClient(fleetId: number, clientId: number) {
    return this.groupRepo.find({ where: { fleetId, clientId }, relations: { vehicles: true } });
  }

  findByIdAndClient(id: number, clientId: number) {
    return this.groupRepo.findOne({ where: { id, clientId } });
  }

  findByIdAndClientWithVehicles(id: number, clientId: number) {
    return this.groupRepo.findOne({ where: { id, clientId }, relations: { vehicles: true } });
  }

  async updateGroup(id: number, data: Partial<FleetVehicleGroup>) {
    await this.groupRepo.update(id, data as any);
    return this.groupRepo.findOne({ where: { id } });
  }

  async deleteGroup(id: number) {
    await this.groupRepo.delete(id);
  }

  // ---- Fleet self-service actor (scoped by the JWT's own fleetId + clientId) ----

  /** Mirrors `controllers/Fleet/vehicleGroupController.js:updateFleetVehicleGroup`/`deleteFleetVehicleGroup`/`groupById`. */
  findByIdFleetClient(id: number, fleetId: number, clientId: number) {
    return this.groupRepo.findOne({ where: { id, fleetId, clientId } });
  }

  findByIdFleetClientWithVehicles(id: number, fleetId: number, clientId: number) {
    return this.groupRepo.findOne({ where: { id, fleetId, clientId }, relations: { vehicles: true } });
  }

  /** Mirrors `controllers/Fleet/vehicleGroupController.js:getAllFleetVehicleGroups`. */
  async findAndCountByFleetClientSearch(fleetId: number, clientId: number, search: string | undefined, skip: number, take: number) {
    const baseQb = this.groupRepo.createQueryBuilder('g').where('g.fleetId = :fleetId', { fleetId }).andWhere('g.clientId = :clientId', { clientId });

    if (search) {
      baseQb.andWhere('g.name LIKE :search', { search: `%${search}%` });
    }

    const count = await baseQb.clone().getCount();

    const ids = await baseQb
      .clone()
      .select('g.id', 'id')
      .orderBy('g.createdAt', 'DESC')
      .skip(skip)
      .take(take)
      .getRawMany<{ id: number }>();
    if (!ids.length) return [[], count] as const;

    const rows = await this.groupRepo
      .createQueryBuilder('g')
      .leftJoinAndSelect('g.vehicles', 'vehicles')
      .where('g.id IN (:...ids)', { ids: ids.map((r) => r.id) })
      .orderBy('g.createdAt', 'DESC')
      .getMany();

    return [rows, count] as const;
  }

  // ---- Super-admin: cross-client (no clientId scope) ----

  /** Mirrors `controllers/suparAdmin/fleet/vehiclegroupContoller.js:getAllVehicleGroupsByFleet`. */
  findGroupsByFleetCrossClient(fleetId: number) {
    return this.groupRepo.find({ where: { fleetId }, relations: { vehicles: true } });
  }

  /** Mirrors `controllers/suparAdmin/fleet/vehiclegroupContoller.js:getGroupDetailById`. */
  findByIdCrossClient(id: number) {
    return this.groupRepo.findOne({ where: { id } });
  }
}
