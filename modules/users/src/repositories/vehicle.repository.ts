import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Not, Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { Vehicle } from '../entities/vehicle.entity';
import { Brand } from '../entities/brand.entity';
import { VehicleModel } from '../entities/vehicle-model.entity';
import { VehicleCapacity } from '../entities/vehicle-capacity.entity';
import { DeviceTransaction } from '../../../sessions/src/entities/device-transaction.entity';

@Injectable()
export class VehicleRepository {
  constructor(
    @InjectRepository(Vehicle) private readonly vehicleRepo: Repository<Vehicle>,
    @InjectRepository(DeviceTransaction) private readonly deviceTransactionRepo: Repository<DeviceTransaction>,
    @InjectRepository(Brand) private readonly brandRepo: Repository<Brand>,
    @InjectRepository(VehicleModel) private readonly vehicleModelRepo: Repository<VehicleModel>,
    @InjectRepository(VehicleCapacity) private readonly vehicleCapacityRepo: Repository<VehicleCapacity>,
  ) {}

  async findByVin(vinNumber: string, clientId: number, excludeId?: number) {
    return this.vehicleRepo.findOne({
      where: { vinNumber, clientId, ...(excludeId && { id: Not(excludeId) }) },
    });
  }

  async findExistingForUser(userId: number, clientId: number) {
    return this.vehicleRepo.findOne({ where: { userId, clientId }, select: { id: true, userId: true } });
  }

  async create(data: DeepPartial<Vehicle>) {
    return this.vehicleRepo.save(this.vehicleRepo.create(data));
  }

  async update(id: number, data: DeepPartial<Vehicle>) {
    await this.vehicleRepo.update({ id }, data as QueryDeepPartialEntity<Vehicle>);
    return this.vehicleRepo.findOneOrFail({ where: { id } });
  }

  async findAllByUser(userId: number, clientId: number) {
    return this.vehicleRepo.find({
      where: { userId, clientId },
      order: { id: 'DESC' },
      relations: { model: { brand: true }, capacity: true },
    });
  }

  async findById(id: number, clientId: number) {
    return this.vehicleRepo.findOne({ where: { id, clientId } });
  }

  async softDelete(id: number) {
    await this.vehicleRepo.update({ id }, { deletedAt: new Date() });
  }

  async unsetPrimaryForUser(userId: number) {
    return this.vehicleRepo.update({ userId }, { isPrimary: false });
  }

  async findLatestOpenDeviceTransactionByMac(macId: string, clientId: number) {
    return this.deviceTransactionRepo.findOne({
      where: { macId, status: 0, clientId },
      order: { createdAt: 'DESC' },
    });
  }

  async linkDeviceTransactionToVehicle(id: number, vehicleId: number) {
    return this.deviceTransactionRepo.update({ id }, { vehicleId });
  }

  async findAllBrands() {
    return this.brandRepo.find();
  }

  async findModelsByBrand(brandId: number) {
    return this.vehicleModelRepo.find({ where: { brandId, status: 'Active' }, order: { id: 'DESC' } });
  }

  async findCapacitiesByModel(modelId: number) {
    return this.vehicleCapacityRepo.find({ where: { modelId } });
  }

  async findOrCreateCapacity(modelId: number, capacity: number) {
    const existing = await this.vehicleCapacityRepo.findOne({ where: { modelId, capacity } });
    if (existing) return existing;
    return this.vehicleCapacityRepo.save(this.vehicleCapacityRepo.create({ modelId, capacity }));
  }
}
