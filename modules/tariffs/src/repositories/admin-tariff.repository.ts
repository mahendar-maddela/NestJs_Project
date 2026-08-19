import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { Tariff } from '../entities/tariff.entity';
import { UserType } from '../../../vendors/src/entities/user-type.entity';
import { VendorUser } from '../../../vendors/src/entities/vendor-user.entity';
import { User } from '../../../users/src/entities/user.entity';
import { Charger } from '../../../chargers/src/entities/charger.entity';
import { FleetVehicleGroup } from '../../../fleet/src/entities/fleet-vehicle-group.entity';

@Injectable()
export class AdminTariffRepository {
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

  findUserTypesByVendorOnly(vendorId: number) {
    return this.userTypeRepo.find({
      where: { vendorId },
      relations: { vendor: true, vendorUsers: true },
      order: { createdAt: 'DESC' },
    });
  }

  // Legacy's nested standard-tariff include has `required: false` here (unlike the vendor/admin
  // "get by id" variants, which default to `required: true`) — chargers without a standard tariff
  // still appear, with an empty `tariff` array, replicated via a left join.
  findUserTypeWithTariffsByIdLeftJoined(userTypeId: number) {
    return this.userTypeRepo
      .createQueryBuilder('ut')
      .leftJoinAndSelect('ut.tariffs', 'tariffs')
      .leftJoinAndSelect('tariffs.charger', 'charger')
      .leftJoinAndSelect('charger.tariff', 'standardTariff', 'standardTariff.userTypeId IS NULL')
      .where('ut.id = :userTypeId', { userTypeId })
      .getRawOne();
  }

  findVendorUsersByUserTypeId(userTypeId: number) {
    return this.vendorUserRepo.find({
      where: { userTypeId },
      relations: { user: true, fleetGroup: true },
    });
  }

  findUserTypeByIdVendorClient(id: number, vendorId: number, clientId: number) {
    return this.userTypeRepo.findOne({ where: { id, vendorId, clientId } });
  }

  findUserTypeByIdAndClient(id: number, clientId: number) {
    return this.userTypeRepo.findOne({ where: { id, clientId } });
  }

  async updateUserType(id: number, data: QueryDeepPartialEntity<UserType>) {
    await this.userTypeRepo.update(id, data);
  }

  findVendorUsersByFleetGroupAndClient(fleetGroupId: number, clientId: number) {
    return this.vendorUserRepo.find({
      where: { fleetGroupId, clientId },
      relations: { userType: true, vendor: true },
    });
  }

  /** Mirrors `controllers/suparAdmin/fleet/tariffController.js:getTariffsByFleetGroupId` — cross-client, no clientId scope. */
  findVendorUsersByFleetGroupCrossClient(fleetGroupId: number) {
    return this.vendorUserRepo.find({
      where: { fleetGroupId },
      relations: { userType: true, vendor: true },
    });
  }

  /** Mirrors `controllers/suparAdmin/fleet/tariffController.js:getTariffsByUserTypeId` — cross-client, no clientId scope.
   * The nested standard-tariff include carries a `where` with no explicit `required: false`, so it's an inner join (Sequelize's default). */
  findUserTypeWithTariffsChargerStationCrossClient(userTypeId: number) {
    return this.userTypeRepo
      .createQueryBuilder('ut')
      .leftJoinAndSelect('ut.tariffs', 'tariffs')
      .leftJoinAndSelect('tariffs.charger', 'charger')
      .leftJoinAndSelect('charger.station', 'station')
      .innerJoinAndSelect('charger.tariff', 'standardTariff', 'standardTariff.userTypeId IS NULL')
      .where('ut.id = :userTypeId', { userTypeId })
      .getRawOne();
  }

  findUserTypesByVendor(vendorId: number, clientId: number) {
    return this.userTypeRepo.find({
      where: { vendorId, clientId },
      relations: { vendor: true, vendorUsers: true },
      order: { createdAt: 'DESC' },
    });
  }

  findUserTypeWithTariffsById(id: number, clientId: number) {
    return this.userTypeRepo.findOne({
      where: { id, clientId },
      relations: { tariffs: { charger: true } },
    });
  }

  /** Mirrors `controllers/Fleet/tariffController.js:getFleetGroupWithVendorUsers`. */
  findFleetGroupWithVendorUsersClient(fleetGroupId: number, clientId: number) {
    return this.fleetVehicleGroupRepo
      .createQueryBuilder('g')
      .select(['g.id', 'g.name', 'g.groupId'])
      .leftJoinAndSelect('g.vendorUserTypes', 'vendorUserTypes')
      .leftJoinAndSelect('vendorUserTypes.userType', 'userType')
      .leftJoinAndSelect('vendorUserTypes.vendor', 'vuVendor')
      .where('g.id = :fleetGroupId', { fleetGroupId })
      .andWhere('g.clientId = :clientId', { clientId })
      .getRawOne();
  }

  /** Mirrors `controllers/Fleet/tariffController.js:getTariffByUserTypeId` — inner-joins the nested standard-tariff (Sequelize's `where`-with-no-`required` default). */
  findUserTypeFullTariffChainClient(userTypeId: number, clientId: number) {
    return this.userTypeRepo
      .createQueryBuilder('ut')
      .leftJoinAndSelect('ut.vendor', 'vendor')
      .leftJoinAndSelect('ut.tariffs', 'tariffs')
      .leftJoinAndSelect('tariffs.charger', 'charger')
      .leftJoinAndSelect('charger.station', 'station')
      .leftJoinAndSelect('station.stationLocation', 'stationLocation')
      .innerJoinAndSelect('charger.tariff', 'standardTariff', 'standardTariff.userTypeId IS NULL')
      .where('ut.id = :userTypeId', { userTypeId })
      .andWhere('ut.clientId = :clientId', { clientId })
      .getRawOne();
  }

  findStandardTariffByCharger(chargerId: number) {
    return this.tariffRepo.findOne({ where: { userTypeId: IsNull(), chargerId } });
  }

  findStandardTariffByChargerVendorClient(chargerId: number, vendorId: number, clientId: number) {
    return this.tariffRepo.findOne({ where: { userTypeId: IsNull(), chargerId, vendorId, clientId } });
  }

  findTariffByUserTypeCharger(userTypeId: number, chargerId: number, vendorId: number, clientId: number) {
    return this.tariffRepo.findOne({ where: { userTypeId, chargerId, vendorId, clientId } });
  }

  createTariff(data: Partial<Tariff>) {
    return this.tariffRepo.save(this.tariffRepo.create(data));
  }

  async updateTariff(id: number, data: QueryDeepPartialEntity<Tariff>) {
    await this.tariffRepo.update(id, data);
  }

  async deleteVendorUsersByUserType(userTypeId: number) {
    await this.vendorUserRepo.delete({ userTypeId });
  }

  async deleteTariffsByUserType(userTypeId: number) {
    await this.tariffRepo.delete({ userTypeId });
  }

  async deleteUserType(id: number) {
    await this.userTypeRepo.delete(id);
  }

  findFleetVehicleGroupById(id: number) {
    return this.fleetVehicleGroupRepo.findOne({ where: { id } });
  }

  findVendorUserByFleetGroupAndVendor(fleetGroupId: number, vendorId: number) {
    return this.vendorUserRepo.findOne({ where: { fleetGroupId, vendorId } });
  }

  findVendorUserByFleetGroupVendorClient(fleetGroupId: number, vendorId: number, clientId: number) {
    return this.vendorUserRepo.findOne({ where: { fleetGroupId, vendorId, clientId } });
  }

  createVendorUser(data: Partial<VendorUser>) {
    return this.vendorUserRepo.save(this.vendorUserRepo.create(data));
  }

  findVendorUserWithFleetGroup(fleetGroupId: number, userTypeId: number, vendorId: number) {
    return this.vendorUserRepo.findOne({
      where: { fleetGroupId, userTypeId, vendorId },
      relations: { fleetGroup: true },
    });
  }

  findUserByUserId(userId: string) {
    return this.userRepo.findOne({ where: { userId } });
  }

  findVendorUserByUserAndVendor(userId: number, vendorId: number) {
    return this.vendorUserRepo.findOne({ where: { userId, vendorId } });
  }

  findVendorUserByUserVendorClient(userId: number, vendorId: number, clientId: number) {
    return this.vendorUserRepo.findOne({ where: { userId, vendorId, clientId } });
  }

  findVendorUserWithUser(userId: number, userTypeId: number, vendorId: number) {
    return this.vendorUserRepo.findOne({
      where: { userId, userTypeId, vendorId },
      relations: { user: true },
    });
  }

  findAssignedVendorUsers(userTypeId: number, clientId: number) {
    return this.vendorUserRepo.find({
      where: { userTypeId, clientId },
      relations: { user: true, fleetGroup: true },
    });
  }

  findVendorUserByIdAndClient(id: number, clientId: number) {
    return this.vendorUserRepo.findOne({ where: { id, clientId } });
  }

  async deleteVendorUser(id: number) {
    await this.vendorUserRepo.delete(id);
  }

  async findChargersByVendorWithStandardTariff(vendorId: number, clientId: number) {
    const chargers = await this.chargerRepo.find({
      where: { vendorId, clientId },
      select: { id: true, chargerId: true, capacity: true },
      relations: { station: true },
    });
    if (!chargers.length) return [];

    const standardTariffs = await this.tariffRepo.find({
      where: { userTypeId: IsNull(), chargerId: In(chargers.map((c) => c.id)) },
    });
    const tariffByCharger = new Map(standardTariffs.map((t) => [t.chargerId, t]));

    // Legacy's `include` with a `where` clause defaults to an inner join, so chargers without a
    // standard tariff are excluded from the result.
    return chargers
      .filter((c) => tariffByCharger.has(c.id))
      .map((c) => ({ ...c, tariff: tariffByCharger.get(c.id) }));
  }
}
