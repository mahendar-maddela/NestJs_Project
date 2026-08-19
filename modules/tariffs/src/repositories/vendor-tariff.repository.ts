import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { UserType } from '../../../vendors/src/entities/user-type.entity';
import { Tariff } from '../entities/tariff.entity';
import { VendorUser } from '../../../vendors/src/entities/vendor-user.entity';
import { User } from '../../../users/src/entities/user.entity';
import { Charger } from '../../../chargers/src/entities/charger.entity';
import { FleetVehicleGroup } from '../../../fleet/src/entities/fleet-vehicle-group.entity';

/** Mirrors `controllers/vendors/tariffController.js`. */
@Injectable()
export class VendorTariffRepository {
  constructor(
    @InjectRepository(UserType) private readonly userTypeRepo: Repository<UserType>,
    @InjectRepository(Tariff) private readonly tariffRepo: Repository<Tariff>,
    @InjectRepository(VendorUser) private readonly vendorUserRepo: Repository<VendorUser>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Charger) private readonly chargerRepo: Repository<Charger>,
    @InjectRepository(FleetVehicleGroup) private readonly fleetVehicleGroupRepo: Repository<FleetVehicleGroup>,
  ) {}

  createUserType(data: Partial<UserType>) {
    return this.userTypeRepo.save(this.userTypeRepo.create(data));
  }

  // Two-phase: `tariffs` and `vendorUsers` are both one-to-many, so joining them directly
  // alongside skip/take would multiply rows and corrupt pagination — page over ids first.
  async findAndCountByVendor(vendorId: number, search: string | undefined, skip: number, take: number): Promise<[UserType[], number]> {
    const idQb = this.userTypeRepo.createQueryBuilder('ut').where('ut.vendorId = :vendorId', { vendorId });
    if (search) {
      idQb.andWhere('ut.name LIKE :s', { s: `%${search}%` });
    }

    const count = await idQb.getCount();
    idQb.orderBy('ut.createdAt', 'DESC').skip(skip).take(take);
    const idRows = await idQb.select('ut.id', 'id').getRawMany<{ id: number }>();
    const ids = idRows.map((r) => r.id);
    if (!ids.length) return [[], count];

    const rows = await this.userTypeRepo
      .createQueryBuilder('ut')
      .leftJoinAndSelect('ut.vendorUsers', 'vendorUsers')
      .leftJoinAndSelect('ut.tariffs', 'tariffs')
      .leftJoinAndSelect('tariffs.staff', 'staff')
      .leftJoinAndSelect('tariffs.vendor', 'vendor')
      .where('ut.id IN (:...ids)', { ids })
      .orderBy('ut.createdAt', 'DESC')
      .getMany();

    const byId = new Map(rows.map((r) => [r.id, r]));
    return [ids.map((id) => byId.get(id)).filter(Boolean) as UserType[], count];
  }

  findUserTypeWithTariffsByIdAndVendor(id: number, vendorId: number) {
    return this.userTypeRepo.findOne({
      where: { id, vendorId },
      relations: { tariffs: { charger: { station: true } } },
    });
  }

  findUserTypeByIdVendorClient(id: number, vendorId: number, clientId: number) {
    return this.userTypeRepo.findOne({ where: { id, vendorId, clientId } });
  }

  findUserTypeByIdAndVendor(id: number, vendorId: number) {
    return this.userTypeRepo.findOne({ where: { id, vendorId } });
  }

  async updateUserType(id: number, data: QueryDeepPartialEntity<UserType>) {
    await this.userTypeRepo.update(id, data);
  }

  async deleteUserType(id: number) {
    await this.userTypeRepo.delete(id);
  }

  findStandardTariffByCharger(chargerId: number) {
    return this.tariffRepo.findOne({ where: { userTypeId: IsNull(), chargerId } });
  }

  findStandardTariffByChargerAndVendor(chargerId: number, vendorId: number) {
    return this.tariffRepo.findOne({ where: { userTypeId: IsNull(), chargerId, vendorId } });
  }

  findTariffByUserTypeChargerVendor(userTypeId: number, chargerId: number, vendorId: number) {
    return this.tariffRepo.findOne({ where: { userTypeId, chargerId, vendorId } });
  }

  createTariff(data: Partial<Tariff>) {
    return this.tariffRepo.save(this.tariffRepo.create(data));
  }

  async updateTariff(id: number, data: QueryDeepPartialEntity<Tariff>) {
    await this.tariffRepo.update(id, data);
  }

  async deleteStaleTariffs(userTypeId: number, vendorId: number, incomingChargerIds: number[]) {
    // Sequelize's `NOT IN (empty array)` matches zero rows (a documented quirk) — replicated
    // by skipping the delete entirely rather than treating it as "no exclusions" (which would
    // delete everything).
    if (!incomingChargerIds.length) return;
    await this.tariffRepo.delete({ userTypeId, vendorId, chargerId: Not(In(incomingChargerIds)) });
  }

  async deleteTariffsByUserTypeAndVendor(userTypeId: number, vendorId: number) {
    await this.tariffRepo.delete({ userTypeId, vendorId });
  }

  findFleetVehicleGroupById(id: number) {
    return this.fleetVehicleGroupRepo.findOne({ where: { id } });
  }

  findVendorUserByFleetGroupAndVendor(fleetGroupId: number, vendorId: number) {
    return this.vendorUserRepo.findOne({ where: { fleetGroupId, vendorId } });
  }

  createVendorUser(data: Partial<VendorUser>) {
    return this.vendorUserRepo.save(this.vendorUserRepo.create(data));
  }

  findVendorUserWithFleetGroup(fleetGroupId: number, userTypeId: number, vendorId: number) {
    return this.vendorUserRepo.findOne({ where: { fleetGroupId, userTypeId, vendorId }, relations: { fleetGroup: true } });
  }

  findUserByUserId(userId: string) {
    return this.userRepo.findOne({ where: { userId } });
  }

  findVendorUserByUserAndVendor(userId: number, vendorId: number) {
    return this.vendorUserRepo.findOne({ where: { userId, vendorId } });
  }

  findVendorUserWithUser(userId: number, userTypeId: number, vendorId: number) {
    return this.vendorUserRepo.findOne({ where: { userId, userTypeId, vendorId }, relations: { user: true } });
  }

  findAssignedVendorUsersByVendor(userTypeId: number, vendorId: number) {
    return this.vendorUserRepo.find({
      where: { userTypeId, vendorId },
      relations: { user: true, fleetGroup: { fleet: true } },
    });
  }

  // Legacy has no scoping at all on this PK lookup (`VendorUser.findOne({where:{id}})`), letting a
  // vendor delete any other tenant's assignment row — scoped here by vendorId.
  findVendorUserByIdAndVendor(id: number, vendorId: number) {
    return this.vendorUserRepo.findOne({ where: { id, vendorId } });
  }

  async deleteVendorUser(id: number) {
    await this.vendorUserRepo.delete(id);
  }

  async findChargersByVendorWithStandardTariff(vendorId: number) {
    const chargers = await this.chargerRepo.find({
      where: { vendorId },
      select: { id: true, chargerId: true, capacity: true, status: true, powerType: true, stationId: true },
      relations: { station: true },
    });
    if (!chargers.length) return [];

    const standardTariffs = await this.tariffRepo.find({ where: { userTypeId: IsNull(), chargerId: In(chargers.map((c) => c.id)) } });
    const tariffByCharger = new Map(standardTariffs.map((t) => [t.chargerId, t]));

    // Legacy's `include` with a `where` clause defaults to an inner join, so chargers without a
    // standard tariff (and, per the `station` include's explicit `required:true`, without a
    // station) are excluded from the result.
    return chargers
      .filter((c) => tariffByCharger.has(c.id) && c.station)
      .map((c) => ({ ...c, tariff: tariffByCharger.get(c.id) }));
  }
}
