import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { AdminVendorTypeRepository } from '../repositories/admin-vendor-type.repository';
import { CreateVendorTypeDto, UpdateVendorTypeDto } from '../dto/admin-vendor-type.dto';

/** Mirrors `controllers/admin/vendorTypeController.js`. */
@Injectable()
export class AdminVendorTypeService {
  constructor(private readonly repo: AdminVendorTypeRepository) {}

  async createVendorType(dto: CreateVendorTypeDto) {
    try {
      const vendorType = await this.repo.create(dto);
      return { success: true, message: 'Vendor type created successfully', data: vendorType };
    } catch {
      throw new InternalServerErrorException({ message: 'Internal server error' });
    }
  }

  async getAllVendorTypes() {
    const vendorTypes = await this.repo.findAll();
    return { success: true, message: 'Vendor types fetched successfully', data: vendorTypes };
  }

  async getVendorTypeById(id: number) {
    const vendorType = await this.repo.findById(id);
    if (!vendorType) {
      throw new NotFoundException({ message: 'Vendor type not found' });
    }
    return { success: true, message: 'Vendor type fetched successfully', data: vendorType };
  }

  async updateVendorType(id: number, dto: UpdateVendorTypeDto) {
    const vendorType = await this.repo.findById(id);
    if (!vendorType) {
      throw new NotFoundException({ message: 'Vendor type not found' });
    }
    const updated = await this.repo.update(id, dto);
    return { success: true, message: 'Vendor type updated successfully', data: updated };
  }

  async deleteVendorType(id: number) {
    const vendorType = await this.repo.findById(id);
    if (!vendorType) {
      throw new NotFoundException({ message: 'Vendor type not found' });
    }
    await this.repo.delete(id);
    return { success: true, message: 'Vendor type deleted successfully' };
  }
}
