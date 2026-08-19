import { Injectable, NotFoundException } from '@nestjs/common';
import { SuperAdminVendorRepository } from '../repositories/super-admin-vendor.repository';
import { SuperAdminVendorQueryDto } from '../dto/super-admin-vendor.dto';

/** Mirrors `controllers/suparAdmin/vendorController.js`. */
@Injectable()
export class SuperAdminVendorService {
  constructor(private readonly repo: SuperAdminVendorRepository) {}

  async getAllClientsVendors(query: SuperAdminVendorQueryDto) {
    const filters = {
      clientId: query.clientId ? Number(query.clientId) : undefined,
      type: query.type ? Number(query.type) : undefined,
      status: query.status,
      search: query.search,
    };

    if (!query.page && !query.limit) {
      const vendors = await this.repo.findAllSimple(filters);
      return { success: true, message: 'Vendors fetched successfully', data: vendors };
    }

    const page = Math.max(parseInt(query.page ?? '', 10) || 1, 1);
    const limit = Math.max(parseInt(query.limit ?? '', 10) || 25, 1);
    const skip = (page - 1) * limit;

    const [rows, count] = await this.repo.findAndCountPaginated(filters, skip, limit);

    return {
      success: true,
      message: 'Cpos fetched successfully',
      data: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    };
  }

  async getClientVendorById(vendorId: number) {
    const vendor = await this.repo.findByIdWithDetails(vendorId);
    if (!vendor) {
      throw new NotFoundException({ success: false, message: 'Vendor not found' });
    }

    const features = await this.repo.findFeaturesByVendor(vendorId);
    const { password, vendorTypeId, ...rest } = vendor;
    void password;
    void vendorTypeId;

    return { success: true, message: 'Vendor fetched successfully', data: { ...rest, features } };
  }
}
