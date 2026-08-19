import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AdminFleetVehicleRepository } from '../repositories/admin-fleet-vehicle.repository';
import { CreateFleetVehicleDto, UpdateFleetVehicleDto, ToggleAutoChargeDto } from '../dto/admin-fleet-vehicle.dto';

/** Mirrors `controllers/vendors/Fleet/vehicleController.js`. */
@Injectable()
export class VendorFleetVehicleService {
  constructor(private readonly repo: AdminFleetVehicleRepository) {}

  async cpoCreateVehicle(clientId: number, dto: CreateFleetVehicleDto) {
    if (!dto.fleetGroupId) {
      throw new BadRequestException({ success: false, message: 'fleetGroupId  is required' });
    }
    if (!dto.fleetId) {
      throw new BadRequestException({ success: false, message: 'fleetId  is required' });
    }
    if (!dto.vinNumber) {
      throw new BadRequestException({ success: false, message: 'Mac id  is required' });
    }

    const existVehicle = await this.repo.findByVinAndClient(dto.vinNumber, clientId);
    if (existVehicle) {
      throw new ConflictException({ success: false, message: 'Vehicle with this VIN already exists' });
    }

    const vehicle = await this.repo.createVehicle({
      modelId: dto.modelId,
      vinNumber: dto.vinNumber,
      autoCharge: dto.autoCharge ?? false,
      regNo: dto.regNo,
      maxAmount: dto.maxAmount,
      fleetGroupId: dto.fleetGroupId,
      fleetId: dto.fleetId,
      userId: null,
      clientId,
      capacityId: dto.capacityId,
    });

    return { success: true, message: 'Vehicle created successfully', data: vehicle };
  }

  async getCpoFleetAllVehicles(groupId: number, clientId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [vehicles, count] = await this.repo.findAndCountByGroup(groupId, clientId, skip, limit);

    return {
      success: true,
      message: 'Vehicles fetched successfully',
      data: vehicles,
      pagination: { totalItems: count, totalPages: Math.ceil(count / limit), currentPage: page, limit },
    };
  }

  async cpoAutoChargetoggleSwitch(vehicleId: number, clientId: number, dto: ToggleAutoChargeDto) {
    const vehicle = await this.repo.findByIdAndClient(vehicleId, clientId);
    if (!vehicle) {
      throw new NotFoundException({ success: false, message: 'Vehicle not found' });
    }

    if (dto.autoCharge === true) {
      const fleet = await this.repo.findFleetByIdAndClient(vehicle.fleetId!, clientId);
      if (!fleet) {
        throw new NotFoundException({ success: false, message: 'Fleet not found' });
      }
      if (fleet.status === 'Block') {
        throw new BadRequestException({ success: false, message: 'Cannot  Auto charge. Fleet is blocked.' });
      }
    }

    const updated = await this.repo.updateVehicle(vehicleId, { autoCharge: dto.autoCharge });
    return { success: true, message: 'AutoCharge updated successfully', data: { id: updated!.id, autoCharge: updated!.autoCharge } };
  }

  async cpoUpdateVehicle(vehicleId: number, clientId: number, dto: UpdateFleetVehicleDto) {
    const vehicle = await this.repo.findByIdAndClient(vehicleId, clientId);
    if (!vehicle) {
      throw new NotFoundException({ success: false, message: 'Vehicle not found' });
    }

    if (dto.vinNumber) {
      const existingVehicle = await this.repo.findByVinClientExcludingId(dto.vinNumber, clientId, vehicleId);
      if (existingVehicle) {
        throw new BadRequestException({ success: false, message: 'Vehicle MAC already exists' });
      }
    }

    const updated = await this.repo.updateVehicle(vehicleId, {
      modelId: dto.modelId,
      vinNumber: dto.vinNumber,
      autoCharge: dto.autoCharge,
      regNo: dto.regNo,
      maxAmount: dto.maxAmount,
      fleetGroupId: dto.fleetGroupId,
      fleetId: dto.fleetId,
      capacityId: dto.capacityId,
    });

    return { success: true, message: 'Vehicle updated successfully', data: updated };
  }

  async cpoGetVehicleById(vehicleId: number, clientId: number) {
    const vehicle = await this.repo.findByIdAndClient(vehicleId, clientId);
    if (!vehicle) {
      throw new NotFoundException({ success: false, message: 'Vehicle not found' });
    }
    return { success: true, message: 'Vehicle updated successfully', data: vehicle };
  }

  async getAllModels(brandId: number) {
    const models = await this.repo.findModelsByBrand(brandId);
    return { success: true, message: 'Models fetched successfully', data: models };
  }

  async getAllBrands() {
    const brands = await this.repo.findAllBrands();
    return { success: true, message: 'Brand fetced successfull', data: brands };
  }

  async getAllCapacities(modelId: number) {
    const capacities = await this.repo.findCapacitiesByModel(modelId);
    return { success: true, message: 'Capacities fetched successfully', data: capacities };
  }
}
