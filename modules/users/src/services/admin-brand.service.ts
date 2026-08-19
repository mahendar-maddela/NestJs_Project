import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AdminBrandRepository } from '../repositories/admin-brand.repository';
import { CreateBrandDto, UpdateBrandDto } from '../dto/brand.dto';

/** Mirrors `controllers/admin/brandController.js`. */
@Injectable()
export class AdminBrandService {
  constructor(private readonly repo: AdminBrandRepository) {}

  async createBrand(dto: CreateBrandDto) {
    if (!dto.name) {
      throw new BadRequestException({ success: false, message: 'Brand name is required' });
    }
    const existing = await this.repo.findByName(dto.name);
    if (existing) {
      throw new ConflictException({ success: false, message: 'Brand already exists' });
    }
    const brand = await this.repo.create(dto.name);
    return { success: true, message: 'Brand created', data: brand };
  }

  async getAllBrands() {
    const brands = await this.repo.findAll();
    return { success: true, data: brands };
  }

  async getBrandById(id: number) {
    const brand = await this.repo.findByIdWithModels(id);
    if (!brand) {
      throw new NotFoundException({ success: false, message: 'Brand not found' });
    }
    return { success: true, data: brand };
  }

  async updateBrand(id: number, dto: UpdateBrandDto) {
    const brand = await this.repo.findById(id);
    if (!brand) {
      throw new NotFoundException({ success: false, message: 'Brand not found' });
    }
    const updated = await this.repo.update(id, dto.name);
    return { success: true, message: 'Brand updated', data: updated };
  }

  async deleteBrand(id: number) {
    const brand = await this.repo.findById(id);
    if (!brand) {
      throw new NotFoundException({ success: false, message: 'Brand not found' });
    }
    await this.repo.delete(id);
    return { success: true, message: 'Brand deleted' };
  }
}
