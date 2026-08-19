import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AdminVehicleModelRepository } from '../repositories/admin-vehicle-model.repository';
import { CreateVehicleModelDto, UpdateVehicleModelDto, UpdateVehicleModelStatusDto } from '../dto/vehicle-model.dto';

/** Mirrors `controllers/admin/vehicleModelController.js`. */
@Injectable()
export class AdminVehicleModelService {
  constructor(private readonly repo: AdminVehicleModelRepository) {}

  async createModel(dto: CreateVehicleModelDto) {
    if (!dto.name || !dto.brandId) {
      throw new BadRequestException({ success: false, message: 'Model name and brandId are required' });
    }

    const brand = await this.repo.findBrandById(dto.brandId);
    if (!brand) {
      throw new NotFoundException({ success: false, message: 'Brand not found' });
    }

    const existingModel = await this.repo.findModelByNameAndBrand(dto.name, dto.brandId);
    if (existingModel) {
      throw new ConflictException({ success: false, message: 'Model already exists for this brand' });
    }

    const model = await this.repo.createModel(dto.name, dto.brandId);

    const capacities = dto.capacities || [];
    if (capacities.length > 0) {
      const existing = await this.repo.findCapacitiesByModel(model.id);
      const existingCapacities = existing.map((e) => e.capacity);
      const newCapacities = capacities.filter((c) => !existingCapacities.includes(c.capacity));
      if (newCapacities.length > 0) {
        await this.repo.createCapacities(model.id, newCapacities.map((c) => c.capacity));
      }
    }

    return { success: true, message: 'Vehicle model created successfully', data: model };
  }

  async getAllModels() {
    const models = await this.repo.findAllWithBrand();
    return { success: true, message: 'Models fetched successfully', data: models };
  }

  async getModelById(id: number) {
    const model = await this.repo.findByIdWithBrandAndCapacities(id);
    if (!model) {
      throw new NotFoundException({ success: false, message: 'Vehicle model not found' });
    }
    return { success: true, message: 'Model fetched successfully', data: model };
  }

  async updateModel(id: number, dto: UpdateVehicleModelDto) {
    const model = await this.repo.findById(id);
    if (!model) {
      throw new NotFoundException({ success: false, message: 'Vehicle model not found' });
    }

    if (dto.brandId) {
      const brand = await this.repo.findBrandById(dto.brandId);
      if (!brand) {
        throw new NotFoundException({ success: false, message: 'Brand not found' });
      }
    }

    if (dto.name && dto.brandId) {
      const duplicate = await this.repo.findModelByNameAndBrand(dto.name, dto.brandId);
      if (duplicate && duplicate.id !== id) {
        throw new ConflictException({ success: false, message: 'Model already exists for this brand' });
      }
    }

    await this.repo.updateModel(id, { name: dto.name, brandId: dto.brandId });

    const capacities = dto.capacities || [];
    if (capacities.length > 0) {
      const newValues = [...new Set(capacities.map((c) => c.capacity))];
      const existing = await this.repo.findCapacitiesByModel(id);
      const existingValues = existing.map((c) => c.capacity);

      const toDelete = existing.filter((record) => !newValues.includes(record.capacity as number)).map((r) => r.id);
      if (toDelete.length) await this.repo.deleteCapacitiesByIds(toDelete);

      const toCreate = newValues.filter((v) => !existingValues.includes(v));
      if (toCreate.length) await this.repo.createCapacities(id, toCreate);
    }

    const updated = await this.repo.findById(id);
    return { success: true, message: 'Model updated successfully', data: updated };
  }

  async deleteModel(id: number) {
    const model = await this.repo.findById(id);
    if (!model) {
      throw new NotFoundException({ success: false, message: 'Vehicle model not found' });
    }
    const capacities = await this.repo.findCapacitiesByModel(id);
    await this.repo.deleteCapacitiesByIds(capacities.map((c) => c.id));
    await this.repo.deleteModel(id);
    return { success: true, message: 'Model deleted successfully' };
  }

  async updateStatus(id: number, dto: UpdateVehicleModelStatusDto) {
    if (!dto.status) {
      throw new BadRequestException({ success: false, message: 'Status is required' });
    }
    const model = await this.repo.findById(id);
    if (!model) {
      throw new NotFoundException({ success: false, message: 'Vehicle model not found' });
    }
    const updated = await this.repo.updateModel(id, { status: dto.status });
    return { success: true, message: 'Status updated successfully', data: updated };
  }

  async getAllCapacities(modelId: number) {
    const capacities = await this.repo.findCapacitiesByModel(modelId);
    return { success: true, message: 'Capacities fetched successfully', data: capacities };
  }
}
