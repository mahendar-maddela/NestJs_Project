import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, IsNull, Like, Repository } from 'typeorm';
import { Vendor } from '../entities/vendor.entity';
import { FeaturePermission } from '../entities/feature-permission.entity';
import { Feature } from '../entities/feature.entity';

export interface SuperAdminVendorFilters {
  clientId?: number;
  type?: number;
  status?: string;
  search?: string;
}

/** Mirrors `controllers/suparAdmin/vendorController.js`. */
@Injectable()
export class SuperAdminVendorRepository {
  constructor(
    @InjectRepository(Vendor) private readonly vendorRepo: Repository<Vendor>,
    @InjectRepository(FeaturePermission) private readonly featurePermissionRepo: Repository<FeaturePermission>,
    @InjectRepository(Feature) private readonly featureRepo: Repository<Feature>,
  ) { }

  /** Build a FindOptionsWhere array from filters (parentVendorId IS NULL + optional fields). */
  private buildWhere(filters: SuperAdminVendorFilters): FindOptionsWhere<Vendor> | FindOptionsWhere<Vendor>[] {
    const base: FindOptionsWhere<Vendor> = {
      parentVendorId: IsNull(),
      ...(filters.clientId && { clientId: filters.clientId }),
      ...(filters.type && { vendorTypeId: filters.type }),
      ...(filters.status && { status: filters.status as any }),
    };

    if (filters.search) {
      const s = `%${filters.search}%`;
      // OR across searchable text columns — spread base into each branch
      return [
        { ...base, vendor_name: Like(s) },
        { ...base, community_name: Like(s) },
        { ...base, phone: Like(s) },
        { ...base, email: Like(s) },
        { ...base, vendorUniqueId: Like(s) },
        { ...base, pan: Like(s) },
        { ...base, gst: Like(s) },
      ];
    }

    return base;
  }

  /** Simple list for dropdowns — id, vendor_name, vendorTypeId, clientId only. */
  findAllSimple(filters: SuperAdminVendorFilters) {
    return this.vendorRepo.find({
      where: this.buildWhere(filters),
      select: { id: true, vendor_name: true, vendorTypeId: true, clientId: true },
      order: { vendor_name: 'ASC' },
    });
  }

  /** Paginated list with client + clientDetails relations. */
  async findAndCountPaginated(filters: SuperAdminVendorFilters, skip: number, take: number) {
    return this.vendorRepo.findAndCount({
      where: this.buildWhere(filters),
      select: {
        id: true,
        vendorUniqueId: true,
        vendor_name: true,
        community_name: true,
        phone: true,
        status: true,
        email: true,
        location: true,
        client: {
          id: true,
          first_name: true,
          last_name: true,
          clientDetails: {
            id: true,
            brandName: true
          }

        }
      },
      relations: { client: { clientDetails: true } },
      order: { id: 'DESC' },
      skip,
      take,
    });
  }

  /** Full vendor detail with tariffs, sub-vendors and bank details. */
  findByIdWithDetails(id: number) {
    return this.vendorRepo.findOne({
      where: { id },
      relations: { tariffs: true, subVendors: true, vendorBankDetails: true },
    });
  }

  /** Features enabled for a vendor via FeaturePermissions join table. */
  async findFeaturesByVendor(vendorId: number) {
    const permissions = await this.featurePermissionRepo.find({ where: { vendorId } });
    if (!permissions.length) return [];
    return this.featureRepo.find({ where: { id: In(permissions.map((p) => p.featureId)) } });
  }
}
