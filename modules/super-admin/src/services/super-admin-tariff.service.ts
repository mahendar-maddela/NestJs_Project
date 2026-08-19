import { Injectable, NotFoundException } from '@nestjs/common';
import { AdminTariffRepository } from '../../../tariffs/src/repositories/admin-tariff.repository';

/** Mirrors `controllers/suparAdmin/tariffController.js`. */
@Injectable()
export class SuperAdminTariffService {
  constructor(private readonly repo: AdminTariffRepository) {}

  async getTariffsByVendor(vendorId: number) {
    const tariffs = await this.repo.findUserTypesByVendorOnly(vendorId);
    return { success: true, message: 'Tariffs fetched successfully', data: tariffs };
  }

  async getTariffByTypeId(tariffId: number) {
    const tariff = await this.repo.findUserTypeWithTariffsByIdLeftJoined(tariffId);
    if (!tariff) {
      throw new NotFoundException({ success: false, message: 'Tariff not found' });
    }
    return { success: true, message: 'Tariff details fetched successfully', data: tariff };
  }

  async getUsersAssignedByTariffTypeId(tariffId: number) {
    const vendorUsers = await this.repo.findVendorUsersByUserTypeId(tariffId);
    return { success: true, message: 'Vendor users fetched successfully', data: vendorUsers };
  }
}
