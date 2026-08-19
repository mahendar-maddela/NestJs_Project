import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Not, Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { FleetUser } from '../entities/fleet-user.entity';
import { FleetUserDetail } from '../entities/fleet-user-detail.entity';
import { FleetVehicleGroup } from '../entities/fleet-vehicle-group.entity';
import { Wallet } from '../../../wallet/src/entities/wallet.entity';
import { PrefixConfig } from '../../../clients/src/entities/prefix-config.entity';
import { ClientDetails } from '../../../clients/src/entities/client-details.entity';
import { RfidTag } from '../entities/rfid-tag.entity';
import { Vehicle } from '../../../users/src/entities/vehicle.entity';

@Injectable()
export class AdminFleetUserRepository {
  constructor(
    @InjectRepository(FleetUser) private readonly fleetUserRepo: Repository<FleetUser>,
    @InjectRepository(FleetUserDetail) private readonly fleetUserDetailRepo: Repository<FleetUserDetail>,
    @InjectRepository(FleetVehicleGroup) private readonly fleetVehicleGroupRepo: Repository<FleetVehicleGroup>,
    @InjectRepository(Wallet) private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(PrefixConfig) private readonly prefixConfigRepo: Repository<PrefixConfig>,
    @InjectRepository(ClientDetails) private readonly clientDetailsRepo: Repository<ClientDetails>,
    @InjectRepository(RfidTag) private readonly rfidTagRepo: Repository<RfidTag>,
    @InjectRepository(Vehicle) private readonly vehicleRepo: Repository<Vehicle>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async runInTransaction<T>(
    work: (repos: {
      fleetUser: Repository<FleetUser>;
      fleetUserDetail: Repository<FleetUserDetail>;
      wallet: Repository<Wallet>;
    }) => Promise<T>,
  ): Promise<T> {
    return this.dataSource.transaction(async (manager) => {
      return work({
        fleetUser: manager.getRepository(FleetUser),
        fleetUserDetail: manager.getRepository(FleetUserDetail),
        wallet: manager.getRepository(Wallet),
      });
    });
  }

  findFleetUserByEmailOrPhone(clientId: number, email: string, phone: string) {
    return this.fleetUserRepo.findOne({ where: [{ clientId, email }, { clientId, phone }] });
  }

  findFleetUserByEmailOrPhoneExcludingId(clientId: number, id: number, email?: string, phone?: string) {
    const wheres: any[] = [];
    if (email) wheres.push({ clientId, id: Not(id), email });
    if (phone) wheres.push({ clientId, id: Not(id), phone });
    if (!wheres.length) return Promise.resolve(null);
    return this.fleetUserRepo.findOne({ where: wheres });
  }

  countFleetUserDetails(clientId: number) {
    return this.fleetUserDetailRepo.count({ where: { clientId } });
  }

  countFleetUsersByFleet(clientId: number, fleetId: number) {
    return this.fleetUserRepo.count({ where: { clientId, fleetId } });
  }

  findPrefixConfig(clientId: number) {
    return this.prefixConfigRepo.findOne({ where: { clientId }, select: { id: true, clientId: true, fleet: true } });
  }

  findClientDetails(clientId: number) {
    return this.clientDetailsRepo.findOne({
      where: { clientId },
      select: { id: true, clientId: true, companyName: true, contactEmail: true, contactPhone: true, address: true, brandName: true, logoUrl: true, primaryColor: true, fleetUrl: true },
    });
  }

  findFleetUserByIdAndClient(id: number, clientId: number) {
    return this.fleetUserRepo.findOne({ where: { id, clientId } });
  }

  findFleetUserDetailById(id: number, clientId: number) {
    return this.fleetUserDetailRepo.findOne({ where: { id, clientId }, select: { id: true, status: true } });
  }

  async findAndCountFleetUserDetails(clientId: number, skip: number, take: number) {
    const [rows, count] = await this.fleetUserDetailRepo.findAndCount({
      where: { clientId },
      select: { id: true, cName: true, fleetUId: true, createdAt: true, clientId: true, status: true },
      relations: { fleetUsers: true, fleetVehicleGroups: true },
      skip,
      take,
    });
    return [rows, count] as const;
  }

  findFleetUserDetailWithWallet(id: number, clientId: number) {
    return this.fleetUserDetailRepo.findOne({
      where: { id, clientId },
      relations: { fleetUsers: true },
    });
  }

  findWalletByFleet(fleetId: number) {
    return this.walletRepo.findOne({ where: { fleetId, type: 'Fleet' } });
  }

  findAllFleetUserDetailsSimple(clientId: number) {
    return this.fleetUserDetailRepo.find({
      where: { clientId },
      select: { id: true, cName: true, fleetUId: true },
      relations: { fleetUsers: true },
    });
  }

  findFleetUserByIdAndClientAndType(id: number, clientId: number) {
    return this.fleetUserRepo.findOne({ where: { id, clientId } });
  }

  async updateFleetUserDetailStatus(id: number, clientId: number, status: string) {
    await this.fleetUserDetailRepo.update({ id, clientId }, { status } as QueryDeepPartialEntity<FleetUserDetail>);
  }

  async bulkUpdateFleetUsersStatusByFleet(fleetId: number, fromStatus: string, toStatus: string, clientId: number) {
    await this.fleetUserRepo.update({ fleetId, status: fromStatus as any, clientId }, { status: toStatus } as QueryDeepPartialEntity<FleetUser>);
  }

  async bulkDisableVehicleAutoChargeByFleet(fleetId: number, clientId: number) {
    await this.vehicleRepo.update({ fleetId, clientId }, { autoCharge: false });
  }

  async expireActiveRfidTagsByFleet(fleetId: number, clientId: number) {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();
    await this.rfidTagRepo
      .createQueryBuilder()
      .update(RfidTag)
      .set({ expiryDate: yesterday })
      .where('fleetId = :fleetId AND clientId = :clientId AND expiryDate >= :now', { fleetId, clientId, now })
      .execute();
  }

  findFleetUserDetailByIdVendorClient(id: number, vendorId: number, clientId: number) {
    return this.fleetUserDetailRepo.findOne({ where: { id, vendorId, clientId }, relations: { fleetUsers: true } });
  }

  // Legacy scopes this "simple list" branch by `clientId` only (no `vendorId`), unlike the
  // paginated branch below — a cross-tenant-within-client leak, fixed here by adding the same
  // vendorId scope. The nested `fleetUsers` include has an implicit inner-join `where` (Sequelize
  // defaults `required: true`), so fleets without a FLEET_MANAGER row are excluded — replicated
  // via `innerJoinAndSelect` rather than a plain relation.
  findAllFleetUserDetailsSimpleByVendor(clientId: number, vendorId: number) {
    return this.fleetUserDetailRepo
      .createQueryBuilder('fud')
      .select(['fud.id', 'fud.cName', 'fud.fleetUId', 'fud.createdAt', 'fud.clientId', 'fud.status'])
      .innerJoinAndSelect('fud.fleetUsers', 'fleetUsers', 'fleetUsers.type = :type', { type: 'FLEET_MANAGER' })
      .addSelect(['fleetUsers.id', 'fleetUsers.name', 'fleetUsers.phone'])
      .where('fud.clientId = :clientId', { clientId })
      .andWhere('fud.vendorId = :vendorId', { vendorId })
      .getMany();
  }

  async findAndCountFleetUserDetailsByVendor(vendorId: number, clientId: number, search: string | undefined, skip: number, take: number) {
    const qb = this.fleetUserDetailRepo
      .createQueryBuilder('fud')
      .innerJoinAndSelect('fud.fleetUsers', 'fleetUsers', 'fleetUsers.type = :type', { type: 'FLEET_MANAGER' })
      .leftJoinAndSelect('fud.vehicles', 'vehicles')
      .leftJoinAndSelect('fud.fleetVehicleGroups', 'fleetVehicleGroups')
      .where('fud.vendorId = :vendorId', { vendorId })
      .andWhere('fud.clientId = :clientId', { clientId });

    if (search) {
      const s = `%${search}%`;
      qb.andWhere('(fud.cName LIKE :s OR fud.fleetUId LIKE :s OR fleetUsers.name LIKE :s)', { s });
    }

    const idQb = qb.clone().select('fud.id', 'id').distinct(true);
    const idRows = await idQb.getRawMany<{ id: number }>();
    const count = idRows.length;
    const pageIds = idRows.map((r) => r.id).slice(skip, skip + take);
    if (!pageIds.length) return [[], count] as const;

    const rows = await this.fleetUserDetailRepo
      .createQueryBuilder('fud')
      .innerJoinAndSelect('fud.fleetUsers', 'fleetUsers', 'fleetUsers.type = :type', { type: 'FLEET_MANAGER' })
      .leftJoinAndSelect('fud.vehicles', 'vehicles')
      .leftJoinAndSelect('fud.fleetVehicleGroups', 'fleetVehicleGroups')
      .where('fud.id IN (:...ids)', { ids: pageIds })
      .getMany();

    const byId = new Map(rows.map((r) => [r.id, r]));
    return [pageIds.map((id) => byId.get(id)).filter(Boolean), count] as const;
  }

  findVendorFleetIds(vendorId: number, clientId: number) {
    return this.fleetUserDetailRepo.find({ where: { vendorId, clientId }, select: { id: true } });
  }

  countGroupsByFleetIds(fleetIds: number[]) {
    if (!fleetIds.length) return Promise.resolve(0);
    return this.fleetVehicleGroupRepo.count({ where: { fleetId: In(fleetIds) } });
  }

  countVehiclesByFleetIds(fleetIds: number[]) {
    if (!fleetIds.length) return Promise.resolve(0);
    return this.vehicleRepo.count({ where: { fleetId: In(fleetIds) } });
  }

  countDriversByFleetIds(fleetIds: number[]) {
    if (!fleetIds.length) return Promise.resolve(0);
    return this.fleetUserRepo.count({ where: { type: 'DRIVER', fleetId: In(fleetIds) } });
  }

  // ---- Super-admin: cross-client (no clientId scope) ----

  /** Mirrors `controllers/suparAdmin/fleet/fleetUserController.js:getAllClientFleetUsers`. */
  async findAndCountFleetUserDetailsCrossClient(clientId: number | undefined, skip: number, take: number) {
    const qb = this.fleetUserDetailRepo
      .createQueryBuilder('fud')
      .select(['fud.id', 'fud.cName', 'fud.fleetUId', 'fud.createdAt', 'fud.clientId', 'fud.status'])
      .innerJoin('fud.fleetUsers', 'fleetUsers', 'fleetUsers.type = :type', { type: 'FLEET_MANAGER' })
      .addSelect(['fleetUsers.id', 'fleetUsers.name', 'fleetUsers.email', 'fleetUsers.phone'])
      .leftJoin('fud.fleetVehicleGroups', 'fleetVehicleGroups')
      .addSelect(['fleetVehicleGroups.id'])
      .skip(skip)
      .take(take);

    if (clientId) qb.andWhere('fud.clientId = :clientId', { clientId });

    return qb.getManyAndCount();
  }

  /** Mirrors `controllers/suparAdmin/fleet/fleetUserController.js:getFleetUserById` — no clientId scope. */
  findFleetUserDetailWithWalletCrossClient(id: number) {
    return this.fleetUserDetailRepo
      .createQueryBuilder('fud')
      .where('fud.id = :id', { id })
      .innerJoinAndSelect('fud.fleetUsers', 'fleetUsers', 'fleetUsers.type = :type', { type: 'FLEET_MANAGER' })
      .getRawOne();
  }

  /** Mirrors `controllers/suparAdmin/fleet/fleetUserController.js:updateFleetUserStatus` — no clientId scope. */
  findFleetUserDetailByIdOnly(id: number) {
    return this.fleetUserDetailRepo.findOne({ where: { id }, select: { id: true, status: true, clientId: true, cName: true } });
  }
}
