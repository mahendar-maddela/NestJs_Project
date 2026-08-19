import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AdminFleetVehicleRepository } from '../repositories/admin-fleet-vehicle.repository';
import { CreateFleetVehicleDto, UpdateFleetVehicleDto, ToggleAutoChargeDto } from '../dto/admin-fleet-vehicle.dto';

/** Mirrors `controllers/admin/fleet/vehicleController.js`. */
@Injectable()
export class AdminFleetVehicleService {
  constructor(private readonly repo: AdminFleetVehicleRepository) {}

  async createVehicle(clientId: number, dto: CreateFleetVehicleDto) {
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
      throw new ConflictException({ success: false, message: 'Vehicle with this Mac already exists' });
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

  async getAllVehicles(fleetGroupId: number, clientId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [vehicles, count] = await this.repo.findAndCountByGroup(fleetGroupId, clientId, skip, limit);

    return {
      success: true,
      message: 'Vehicles fetched successfully',
      data: vehicles,
      pagination: { totalItems: count, totalPages: Math.ceil(count / limit), currentPage: page, limit },
    };
  }

  async toggleAutoCharge(id: number, clientId: number, dto: ToggleAutoChargeDto) {
    const vehicle = await this.repo.findByIdAndClient(id, clientId);
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

    const updated = await this.repo.updateVehicle(id, { autoCharge: dto.autoCharge });

    return { success: true, message: 'AutoCharge updated successfully', data: { id: updated!.id, autoCharge: updated!.autoCharge } };
  }

  async updateVehicle(vehicleId: number, clientId: number, dto: UpdateFleetVehicleDto) {
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
}
