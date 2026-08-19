import { Injectable } from '@nestjs/common';
import { VendorRepository } from '../repositories/vendor.repository';

@Injectable()
export class VendorService {
  constructor(private readonly vendorRepository: VendorRepository) {}

  async getVendorById(id: number) {
    return this.vendorRepository.findById(id);
  }

  async getAllVendors() {
    return this.vendorRepository.findAll();
  }

  async getUserTypes(vendorId: number) {
    const userTypes = await this.vendorRepository.findUserTypesByVendorId(vendorId);
    return { success: true, message: 'User types fetched successfully', data: userTypes };
  }

  async getVendorPermissions() {
    const permissions = await this.vendorRepository.findVendorPermissions();
    return { success: true, message: 'Permissions fetched successfully', data: permissions };
  }

  async getActiveAmenities() {
    const amenities = await this.vendorRepository.findActiveAmenities();
    return { success: true, message: 'Amenities fetched successfully', data: amenities };
  }
}
