import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Vehicle } from '../../../users/src/entities/vehicle.entity';
import { FleetUserDetail } from '../entities/fleet-user-detail.entity';
import { VehicleModel } from '../../../users/src/entities/vehicle-model.entity';
import { Brand } from '../../../users/src/entities/brand.entity';
import { VehicleCapacity } from '../../../users/src/entities/vehicle-capacity.entity';
import { DeviceTransaction } from '../../../sessions/src/entities/device-transaction.entity';
import { FleetDriverVehicle } from '../entities/fleet-driver-vehicle.entity';

@Injectable()
export class AdminFleetVehicleRepository {
  constructor(
    @InjectRepository(Vehicle) private readonly vehicleRepo: Repository<Vehicle>,
    @InjectRepository(FleetUserDetail) private readonly fleetUserDetailRepo: Repository<FleetUserDetail>,
    @InjectRepository(VehicleModel) private readonly vehicleModelRepo: Repository<VehicleModel>,
    @InjectRepository(Brand) private readonly brandRepo: Repository<Brand>,
    @InjectRepository(VehicleCapacity) private readonly vehicleCapacityRepo: Repository<VehicleCapacity>,
    @InjectRepository(DeviceTransaction) private readonly deviceTransactionRepo: Repository<DeviceTransaction>,
    @InjectRepository(FleetDriverVehicle) private readonly fleetDriverVehicleRepo: Repository<FleetDriverVehicle>,
  ) {}

  findModelsByBrand(brandId: number) {
    return this.vehicleModelRepo.find({ where: { brandId } });
  }

  findAllBrands() {
    return this.brandRepo.find();
  }

  findCapacitiesByModel(modelId: number) {
    return this.vehicleCapacityRepo.find({ where: { modelId } });
  }

  findByVinAndClient(vinNumber: string, clientId: number) {
    return this.vehicleRepo.findOne({ where: { vinNumber, clientId } });
  }

  findByVinClientExcludingId(vinNumber: string, clientId: number, excludeId: number) {
    return this.vehicleRepo.findOne({ where: { vinNumber, clientId, id: Not(excludeId) } });
  }

  createVehicle(data: Partial<Vehicle>) {
    return this.vehicleRepo.save(this.vehicleRepo.create(data));
  }

  async findAndCountByGroup(fleetGroupId: number, clientId: number, skip: number, take: number) {
    return this.vehicleRepo.findAndCount({
      where: { fleetGroupId, clientId },
      relations: { model: { brand: true } },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  findByIdAndClient(id: number, clientId: number) {
    return this.vehicleRepo.findOne({ where: { id, clientId } });
  }

  findFleetByIdAndClient(id: number, clientId: number) {
    return this.fleetUserDetailRepo.findOne({ where: { id, clientId }, select: { id: true, status: true } });
  }

  async updateVehicle(id: number, data: Partial<Vehicle>) {
    await this.vehicleRepo.update(id, data as any);
    return this.vehicleRepo.findOne({ where: { id } });
  }

  // ---- Fleet self-service actor (scoped by the JWT's own fleetId + clientId) ----

  /** Mirrors `controllers/Fleet/vehicleGroupController.js:groupIdByVehicle`. */
  findAllByGroupFleetClient(fleetGroupId: number, fleetId: number, clientId: number) {
    return this.vehicleRepo.find({
      where: { fleetGroupId, fleetId, clientId },
      relations: { model: { brand: true } },
    });
  }

  /** Mirrors `controllers/Fleet/vehicleController.js:getAllVehicles` (unpaginated branch). */
  findAllByFleetClientSearch(fleetId: number, clientId: number, search: string | undefined) {
    const qb = this.vehicleRepo
      .createQueryBuilder('v')
      .leftJoinAndSelect('v.model', 'model')
      .leftJoinAndSelect('model.brand', 'brand')
      .where('v.fleetId = :fleetId', { fleetId })
      .andWhere('v.clientId = :clientId', { clientId });

    if (search) {
      const s = `%${search}%`;
      qb.andWhere('(v.regNo LIKE :s OR v.vinNumber LIKE :s)', { s });
    }

    return qb.orderBy('v.id', 'DESC').getMany();
  }

  /** Mirrors `controllers/Fleet/vehicleController.js:getAllVehicles` (paginated branch). */
  findAndCountByFleetClientSearch(fleetId: number, clientId: number, search: string | undefined, skip: number, take: number) {
    const qb = this.vehicleRepo
      .createQueryBuilder('v')
      .leftJoinAndSelect('v.model', 'model')
      .leftJoinAndSelect('model.brand', 'brand')
      .leftJoinAndSelect('v.fleetGroup', 'fleetVehicleGroup')
      .where('v.fleetId = :fleetId', { fleetId })
      .andWhere('v.clientId = :clientId', { clientId });

    if (search) {
      const s = `%${search}%`;
      qb.andWhere('(v.regNo LIKE :s OR v.vinNumber LIKE :s)', { s });
    }

    qb.orderBy('v.id', 'DESC').skip(skip).take(take);

    return qb.getManyAndCount();
  }

  countByFleetClient(fleetId: number, clientId: number) {
    return this.vehicleRepo.count({ where: { fleetId, clientId } });
  }

  findByIdClientWithModelBrand(id: number, clientId: number) {
    return this.vehicleRepo.findOne({ where: { id, clientId }, relations: { model: { brand: true } } });
  }

  /** Mirrors `controllers/Fleet/vehicleController.js:deleteVehicle` (paranoid soft-delete). */
  async softDeleteVehicle(id: number) {
    await this.vehicleRepo.update(id, { deletedAt: new Date() });
  }

  /** Mirrors `controllers/Fleet/vehicleController.js:getAllModelsByBrandId` — status filter + order, unlike the admin-scoped `findModelsByBrand`. */
  findActiveModelsByBrand(brandId: number) {
    return this.vehicleModelRepo.find({ where: { brandId, status: 'Active' as any }, order: { id: 'DESC' } });
  }

  /** Mirrors `controllers/Fleet/vehicleController.js:vehicleHistoryData`. */
  async findChargingSummaryByVehicle(vehicleId: number) {
    const raw = await this.deviceTransactionRepo
      .createQueryBuilder('dt')
      .select('COUNT(dt.id)', 'totalSessions')
      .addSelect('COALESCE(SUM(dt.totalWh), 0)', 'totalWhConsumed')
      .addSelect('COALESCE(SUM(dt.amount), 0)', 'totalAmountSpent')
      .addSelect('COALESCE(AVG(dt.amount), 0)', 'avgCostPerSession')
      .where('dt.vehicleId = :vehicleId', { vehicleId })
      .getRawOne<{ totalSessions: string; totalWhConsumed: string; totalAmountSpent: string; avgCostPerSession: string }>();

    return {
      totalSessions: Number(raw?.totalSessions) || 0,
      totalWhConsumed: Number(raw?.totalWhConsumed) || 0,
      totalAmountSpent: Number(raw?.totalAmountSpent) || 0,
      avgCostPerSession: Number(raw?.avgCostPerSession) || 0,
    };
  }

  countActiveDriverAssignmentsByVehicle(vehicleId: number) {
    return this.fleetDriverVehicleRepo
      .createQueryBuilder('fdv')
      .where('fdv.vehicleId = :vehicleId', { vehicleId })
      .andWhere('(fdv.status = :status OR fdv.endDate IS NULL)', { status: 'ACTIVE' })
      .getCount();
  }

  // ---- Super-admin: cross-client (no clientId scope) ----

  /** Mirrors `controllers/suparAdmin/fleet/vehicleController.js:getVehiclesBygroupId`. */
  async findAndCountByGroupCrossClient(fleetGroupId: number, skip: number, take: number) {
    return this.vehicleRepo.findAndCount({
      where: { fleetGroupId },
      relations: { model: { brand: true } },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  /** Mirrors `controllers/suparAdmin/fleet/vehicleController.js:updateAutoChargeOfVehicleById`. */
  findByIdOnly(id: number) {
    return this.vehicleRepo.findOne({ where: { id } });
  }
}
