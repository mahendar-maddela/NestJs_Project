import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { VehicleRepository } from '../repositories/vehicle.repository';
import { AutoChargeToggleDto, CreateVehicleDto, UpdateVehicleDto } from '../dto/vehicle.dto';

/** Driver vehicle management. Mirrors legacy `controllers/APP/vehicleController.js`. */
@Injectable()
export class VehicleService {
  constructor(private readonly repo: VehicleRepository) {}

  async create(userId: number, clientId: number, dto: CreateVehicleDto, isChargingFlow: boolean) {
    if (dto.vinNumber) {
      const existingByVin = await this.repo.findByVin(dto.vinNumber, clientId);
      if (existingByVin) throw new BadRequestException('Vehicle MAC already exists');
    }

    const existingForUser = await this.repo.findExistingForUser(userId, clientId);

    const vehicle = await this.repo.create({
      vinNumber: dto.vinNumber,
      modelId: dto.modelId,
      capacityId: dto.capacityId ?? null,
      regNo: dto.regNo,
      maxAmount: dto.maxAmount,
      range: dto.range,
      autoCharge: isChargingFlow,
      userId,
      clientId,
      isPrimary: !existingForUser,
    });

    if (isChargingFlow && vehicle.vinNumber) {
      const openTransaction = await this.repo.findLatestOpenDeviceTransactionByMac(vehicle.vinNumber, clientId);
      if (openTransaction) {
        await this.repo.linkDeviceTransactionToVehicle(openTransaction.id, vehicle.id);
      }
    }

    let updated = vehicle;
    if (!dto.capacityId && dto.capacity) {
      const capacityInstance = await this.repo.findOrCreateCapacity(dto.modelId, dto.capacity);
      updated = await this.repo.update(vehicle.id, { capacityId: capacityInstance.id });
    }

    return { success: true, message: 'Vehicle created successfully', data: updated };
  }

  async findAll(userId: number, clientId: number) {
    const vehicles = await this.repo.findAllByUser(userId, clientId);
    return { success: true, message: 'Vehicles fetched successfully', data: vehicles };
  }

  async findById(id: number, clientId: number) {
    const vehicle = await this.repo.findById(id, clientId);
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return { success: true, message: 'Vehicle fetched successfully', data: vehicle };
  }

  async update(id: number, clientId: number, dto: UpdateVehicleDto, isChargingFlow: boolean) {
    const vehicle = await this.repo.findById(id, clientId);
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    if (dto.vinNumber) {
      const existingByVin = await this.repo.findByVin(dto.vinNumber, clientId, id);
      if (existingByVin) throw new BadRequestException('Vehicle MAC already exists');
    }

    let updated = await this.repo.update(id, {
      ...(dto.vinNumber !== undefined && { vinNumber: dto.vinNumber }),
      ...(dto.modelId !== undefined && { modelId: dto.modelId }),
      ...(dto.capacityId !== undefined && { capacityId: dto.capacityId }),
      ...(dto.regNo !== undefined && { regNo: dto.regNo }),
      ...(dto.maxAmount !== undefined && { maxAmount: dto.maxAmount }),
      ...(dto.range !== undefined && { range: dto.range }),
    });

    if (!updated.vinNumber) {
      updated = await this.repo.update(id, { autoCharge: false });
    }

    if (isChargingFlow) {
      const openTransaction = updated.vinNumber
        ? await this.repo.findLatestOpenDeviceTransactionByMac(updated.vinNumber, clientId)
        : null;
      updated = await this.repo.update(id, { autoCharge: true });
      if (openTransaction) {
        await this.repo.linkDeviceTransactionToVehicle(openTransaction.id, id);
      }
    }

    if (!dto.capacityId && dto.capacity && dto.modelId) {
      const capacityInstance = await this.repo.findOrCreateCapacity(dto.modelId, dto.capacity);
      updated = await this.repo.update(id, { capacityId: capacityInstance.id });
    }

    return { success: true, message: 'Vehicle updated successfully', data: updated };
  }

  async delete(id: number, clientId: number) {
    const vehicle = await this.repo.findById(id, clientId);
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    await this.repo.softDelete(id);
    return { success: true, message: 'Vehicle deleted successfully', data: vehicle };
  }

  async toggleAutoCharge(id: number, clientId: number, dto: AutoChargeToggleDto) {
    const vehicle = await this.repo.findById(id, clientId);
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    if (!vehicle.vinNumber && !vehicle.autoCharge) {
      throw new BadRequestException('Please add MAC ID before enabling auto charge');
    }

    const updated = await this.repo.update(id, { autoCharge: dto.autoCharge });
    return { success: true, message: 'Auto charge status updated successfully', data: updated };
  }

  async updateAsPrimary(vehicleId: number, userId: number, clientId: number) {
    const vehicle = await this.repo.findById(vehicleId, clientId);
    if (!vehicle || vehicle.userId !== userId) throw new NotFoundException('Vehicle not found');

    await this.repo.unsetPrimaryForUser(userId);
    const updated = await this.repo.update(vehicleId, { isPrimary: true });

    return { success: true, message: 'Primary vehicle updated successfully', data: updated };
  }

  async getAllBrands() {
    const brands = await this.repo.findAllBrands();
    return { success: true, message: 'Brands fetched successfully', data: brands };
  }

  async getModelsByBrand(brandId: number) {
    const models = await this.repo.findModelsByBrand(brandId);
    return { success: true, message: 'Models fetched successfully', data: models };
  }

  async getCapacitiesByModel(modelId: number) {
    const capacities = await this.repo.findCapacitiesByModel(modelId);
    return { success: true, message: 'Capacities fetched successfully', data: capacities };
  }
}
