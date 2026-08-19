import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AdminFleetVehicleRepository } from '../repositories/admin-fleet-vehicle.repository';
import { CreateFleetVehicleDto, UpdateFleetVehicleDto, FleetToggleAutoChargeDto } from '../dto/fleet-vehicle.dto';

/** Mirrors `controllers/Fleet/vehicleController.js`. */
@Injectable()
export class FleetVehicleService {
  constructor(private readonly repo: AdminFleetVehicleRepository) {}

  async createVehicle(fleetId: number, clientId: number, dto: CreateFleetVehicleDto) {
    const oldVehicle = await this.repo.findByVinAndClient(dto.vinNumber, clientId);
    if (oldVehicle) {
      throw new BadRequestException({ success: false, message: 'Vehicle MAC already exists' });
    }

    const fleet = await this.repo.findFleetByIdAndClient(fleetId, clientId);
    if (!fleet) {
      throw new NotFoundException({ message: 'Fleet not found' });
    }

    const currentVehicleCount = await this.repo.countByFleetClient(fleetId, clientId);
    if (fleet.noOfVehicle !== null && currentVehicleCount >= fleet.noOfVehicle) {
      throw new BadRequestException({ message: 'Maximum number of Vehicle reached for this fleet' });
    }

    const vehicle = await this.repo.createVehicle({
      vinNumber: dto.vinNumber,
      modelId: dto.modelId,
      regNo: dto.regNo,
      maxAmount: dto.maxAmount,
      capacityId: dto.capacityId,
      range: dto.range,
      isPrimary: dto.isPrimary,
      autoCharge: dto.type === 'Charging',
      fleetId,
      fleetGroupId: dto.fleetGroupId || null,
      clientId,
    });

    const createdVehicle = await this.repo.findByIdClientWithModelBrand(vehicle.id, clientId);
    return { success: true, message: 'Vehicle created successfully', data: createdVehicle };
  }

  async getAllVehicles(fleetId: number, clientId: number, page: number | undefined, limit: number | undefined, search: string | undefined) {
    if (!page && !limit) {
      const vehicles = await this.repo.findAllByFleetClientSearch(fleetId, clientId, search);
      return { success: true, message: 'All Vehicles fetched successfully', data: vehicles };
    }

    const skip = (page! - 1) * limit!;
    const [rows, count] = await this.repo.findAndCountByFleetClientSearch(fleetId, clientId, search, skip, limit!);

    return {
      success: true,
      message: 'Vehicles fetched successfully',
      data: rows,
      pagination: { totalItems: count, totalPages: Math.ceil(count / limit!), currentPage: page },
    };
  }

  async getVehicleById(id: number, clientId: number) {
    const vehicle = await this.repo.findByIdAndClient(id, clientId);
    if (!vehicle) {
      throw new NotFoundException({ message: 'Vehicle not found' });
    }
    return { success: true, message: 'Vehicle fetched successfully', data: vehicle };
  }

  async updateVehicle(id: number, clientId: number, dto: UpdateFleetVehicleDto) {
    const vehicle = await this.repo.findByIdAndClient(id, clientId);
    if (!vehicle) {
      throw new NotFoundException({ message: 'Vehicle not found' });
    }

    if (dto.vinNumber) {
      const existingVehicle = await this.repo.findByVinClientExcludingId(dto.vinNumber, clientId, id);
      if (existingVehicle) {
        throw new BadRequestException({ success: false, message: 'Vehicle MAC already exists' });
      }
    }

    await this.repo.updateVehicle(id, {
      vinNumber: dto.vinNumber ?? vehicle.vinNumber,
      modelId: dto.modelId ?? vehicle.modelId,
      regNo: dto.regNo ?? vehicle.regNo,
      maxAmount: dto.maxAmount ?? vehicle.maxAmount,
      capacityId: dto.capacityId ?? vehicle.capacityId,
      fleetGroupId: dto.fleetGroupId ?? vehicle.fleetGroupId,
      range: dto.range ?? vehicle.range,
      isPrimary: dto.isPrimary ?? vehicle.isPrimary,
      autoCharge: dto.autoCharge ?? vehicle.autoCharge,
    });

    const updatedVehicle = await this.repo.findByIdClientWithModelBrand(id, clientId);
    return { success: true, message: 'Vehicle updated successfully', data: updatedVehicle };
  }

  async deleteVehicle(id: number, clientId: number) {
    const vehicle = await this.repo.findByIdAndClient(id, clientId);
    if (!vehicle) {
      throw new NotFoundException({ message: 'Vehicle not found' });
    }

    await this.repo.softDeleteVehicle(id);
    return { success: true, message: 'Vehicle deleted successfully', data: vehicle };
  }

  async autoChargeEnbleAndDisable(id: number, clientId: number, dto: FleetToggleAutoChargeDto) {
    const vehicle = await this.repo.findByIdAndClient(id, clientId);
    if (!vehicle) {
      throw new NotFoundException({ message: 'Vehicle not found' });
    }

    await this.repo.updateVehicle(id, { autoCharge: dto.autoCharge });
    return { success: true, message: 'Auto charge status updated successfully', data: { ...vehicle, autoCharge: dto.autoCharge } };
  }

  async getAllBrands() {
    const brands = await this.repo.findAllBrands();
    return { success: true, message: 'Brands fetched successfully', data: brands };
  }

  async getAllModelsByBrandId(brandId: number) {
    const models = await this.repo.findActiveModelsByBrand(brandId);
    return { success: true, message: 'Models fetched successfully', data: models };
  }

  async getAllCapacities(modelId: number) {
    const capacities = await this.repo.findCapacitiesByModel(modelId);
    return { success: true, message: 'Capacities fetched successfully', data: capacities };
  }

  async vehicleHistoryData(vehicleId: number, clientId: number) {
    const vehicle = await this.repo.findByIdClientWithModelBrand(vehicleId, clientId);
    if (!vehicle) {
      throw new NotFoundException({ success: false, message: 'Vehicle not found' });
    }

    const summary = await this.repo.findChargingSummaryByVehicle(vehicleId);
    const totalKwh = summary.totalWhConsumed / 1000;
    const activeDriverCount = await this.repo.countActiveDriverAssignmentsByVehicle(vehicleId);

    return {
      success: true,
      data: {
        vehicle: {
          vinNumber: vehicle.vinNumber,
          regNo: vehicle.regNo,
          model: vehicle.model?.name || null,
          brand: vehicle.model?.brand?.name || null,
        },
        chargingSummary: {
          totalSessions: summary.totalSessions,
          totalEnergyConsumedKwh: Number(totalKwh.toFixed(2)),
          totalAmountSpent: Number(summary.totalAmountSpent.toFixed(2)),
          avgCostPerSession: Number(summary.avgCostPerSession.toFixed(2)),
        },
        activeDriverCount,
      },
    };
  }
}
