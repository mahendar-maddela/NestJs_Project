import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FleetUser } from '../entities/fleet-user.entity';
import { FleetUserDetail } from '../entities/fleet-user-detail.entity';
import { PrefixConfig } from '../../../clients/src/entities/prefix-config.entity';
import { DeviceTransaction } from '../../../sessions/src/entities/device-transaction.entity';
import { FleetDriverVehicle } from '../entities/fleet-driver-vehicle.entity';

@Injectable()
export class AdminDriverRepository {
  constructor(
    @InjectRepository(FleetUser) private readonly fleetUserRepo: Repository<FleetUser>,
    @InjectRepository(FleetUserDetail) private readonly fleetUserDetailRepo: Repository<FleetUserDetail>,
    @InjectRepository(PrefixConfig) private readonly prefixConfigRepo: Repository<PrefixConfig>,
    @InjectRepository(DeviceTransaction) private readonly deviceTransactionRepo: Repository<DeviceTransaction>,
    @InjectRepository(FleetDriverVehicle) private readonly fleetDriverVehicleRepo: Repository<FleetDriverVehicle>,
  ) {}

  findDriversByFleet(fleetId: number, clientId: number) {
    return this.fleetUserRepo.find({
      where: { fleetId, type: 'DRIVER', clientId },
      select: { id: true, name: true, fleetId: true, phone: true, email: true, licenseNumber: true, aadharNumber: true, address: true, drId: true, type: true, status: true, clientId: true, createdAt: true, updatedAt: true },
    });
  }

  // Legacy has no clientId scope on this list at all (`where:{fleetId, type:'DRIVER'}`), a
  // cross-tenant leak if `fleetId` belongs to another client — scoped here to match the sibling
  // create/lookup methods in the same controller, which do scope by clientId.
  findAndCountDriversByFleet(fleetId: number, clientId: number, skip: number, take: number) {
    return this.fleetUserRepo.findAndCount({
      where: { fleetId, type: 'DRIVER', clientId },
      select: {
        id: true,
        name: true,
        fleetId: true,
        phone: true,
        email: true,
        licenseNumber: true,
        aadharNumber: true,
        address: true,
        drId: true,
        type: true,
        status: true,
        clientId: true,
        createdAt: true,
        updatedAt: true,
      },
      skip,
      take,
    });
  }

  findExistingDriverByEmailOrPhone(fleetId: number, clientId: number, email?: string, phone?: string) {
    const wheres: any[] = [];
    if (email) wheres.push({ fleetId, clientId, email });
    if (phone) wheres.push({ fleetId, clientId, phone });
    if (!wheres.length) return Promise.resolve(null);
    return this.fleetUserRepo.findOne({ where: wheres });
  }

  countDriversByFleet(fleetId: number, clientId: number) {
    return this.fleetUserRepo.count({ where: { fleetId, type: 'DRIVER', clientId } });
  }

  createDriver(data: Partial<FleetUser>) {
    return this.fleetUserRepo.save(this.fleetUserRepo.create(data));
  }

  async updateDriverDrId(id: number, drId: string) {
    await this.fleetUserRepo.update(id, { drId });
  }

  findPrefixConfig(clientId: number) {
    return this.prefixConfigRepo.findOne({ where: { clientId }, select: { id: true, clientId: true, driver: true } });
  }

  findDriverByIdAndClient(id: number, clientId: number) {
    return this.fleetUserRepo.findOne({ where: { id, clientId } });
  }

  findFleetDetailByIdAndClient(id: number, clientId: number) {
    return this.fleetUserDetailRepo.findOne({ where: { id, clientId }, select: { id: true, status: true } });
  }

  async updateDriver(id: number, data: Partial<FleetUser>) {
    await this.fleetUserRepo.update(id, data as any);
    return this.fleetUserRepo.findOne({ where: { id } });
  }

  // ---- Fleet self-service actor (scoped by the JWT's own fleetId + clientId) ----

  private driversQb(fleetId: number, clientId: number, search: string | undefined) {
    const qb = this.fleetUserRepo
      .createQueryBuilder('fu')
      .where('fu.fleetId = :fleetId', { fleetId })
      .andWhere('fu.type = :type', { type: 'DRIVER' })
      .andWhere('fu.clientId = :clientId', { clientId });

    if (search) {
      const s = `%${search}%`;
      qb.andWhere('(fu.name LIKE :s OR fu.email LIKE :s OR fu.phone LIKE :s)', { s });
    }

    return qb;
  }

  /** Mirrors `controllers/Fleet/driverController.js:getAllDrivers` (unpaginated branch). */
  findAllDriversByFleetSearch(fleetId: number, clientId: number, search: string | undefined) {
    return this.driversQb(fleetId, clientId, search).orderBy('fu.createdAt', 'DESC').getMany();
  }

  /** Mirrors `controllers/Fleet/driverController.js:getAllDrivers` (paginated branch). */
  findAndCountDriversByFleetSearch(fleetId: number, clientId: number, search: string | undefined, skip: number, take: number) {
    return this.driversQb(fleetId, clientId, search).orderBy('fu.createdAt', 'DESC').skip(skip).take(take).getManyAndCount();
  }

  /** Mirrors `controllers/Fleet/driverController.js:getDriverById`. */
  async findDriverSessionStats(driverId: number) {
    const raw = await this.deviceTransactionRepo
      .createQueryBuilder('dt')
      .select('COUNT(dt.transactionId)', 'sessionCount')
      .addSelect('SUM(dt.totalWh)', 'totalUnits')
      .addSelect('SUM(dt.amount)', 'totalAmount')
      .where('dt.startDriverId = :driverId', { driverId })
      .andWhere('dt.status != 0')
      .getRawOne<{ sessionCount: string; totalUnits: string; totalAmount: string }>();

    return {
      sessionCount: Number(raw?.sessionCount) || 0,
      totalUnits: Number(raw?.totalUnits) || 0,
      totalAmount: Number(raw?.totalAmount) || 0,
    };
  }

  /** Mirrors `controllers/Fleet/driverController.js:driverAssignedHistory`. */
  findAndCountAssignmentHistory(driverId: number, clientId: number, skip: number, take: number) {
    return this.fleetDriverVehicleRepo
      .createQueryBuilder('fdv')
      .leftJoinAndSelect('fdv.vehicle', 'vehicle')
      .where('fdv.fleetDriverId = :driverId', { driverId })
      .andWhere('fdv.clientId = :clientId', { clientId })
      .orderBy('fdv.createdAt', 'DESC')
      .skip(skip)
      .take(take)
      .getManyAndCount();
  }

  /** Mirrors `controllers/Fleet/driverController.js:driverChargingSessionHistory`. */
  findChargingSessionsByDriver(driverId: number) {
    return this.deviceTransactionRepo
      .createQueryBuilder('dt')
      .leftJoinAndSelect('dt.startDriver', 'startDriver')
      .where('dt.startDriverId = :driverId', { driverId })
      .orderBy('dt.startDate', 'DESC')
      .getMany();
  }
}
