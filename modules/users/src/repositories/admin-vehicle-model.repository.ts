import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { VehicleModel } from '../entities/vehicle-model.entity';
import { VehicleCapacity } from '../entities/vehicle-capacity.entity';
import { Brand } from '../entities/brand.entity';

@Injectable()
export class AdminVehicleModelRepository {
  constructor(
    @InjectRepository(VehicleModel) private readonly modelRepo: Repository<VehicleModel>,
    @InjectRepository(VehicleCapacity) private readonly capacityRepo: Repository<VehicleCapacity>,
    @InjectRepository(Brand) private readonly brandRepo: Repository<Brand>,
  ) {}

  async findBrandById(id: number) {
    return this.brandRepo.findOne({ where: { id } });
  }

  async findModelByNameAndBrand(name: string, brandId: number) {
    return this.modelRepo.findOne({ where: { name, brandId } });
  }

  async createModel(name: string, brandId: number) {
    return this.modelRepo.save(this.modelRepo.create({ name, brandId }));
  }

  async findAllWithBrand() {
    return this.modelRepo.find({ relations: { brand: true }, order: { id: 'DESC' } });
  }

  async findByIdWithBrandAndCapacities(id: number) {
    return this.modelRepo.findOne({ where: { id }, relations: { brand: true, capacities: true } });
  }

  async findById(id: number) {
    return this.modelRepo.findOne({ where: { id } });
  }

  async updateModel(id: number, data: Partial<VehicleModel>) {
    await this.modelRepo.update(id, data);
    return this.findById(id);
  }

  async deleteModel(id: number) {
    return this.modelRepo.delete(id);
  }

  async findCapacitiesByModel(modelId: number) {
    return this.capacityRepo.find({ where: { modelId } });
  }

  async createCapacities(modelId: number, values: number[]) {
    if (!values.length) return;
    await this.capacityRepo.save(values.map((capacity) => this.capacityRepo.create({ modelId, capacity })));
  }

  async deleteCapacitiesByIds(ids: number[]) {
    if (!ids.length) return;
    await this.capacityRepo.delete({ id: In(ids) });
  }
}
