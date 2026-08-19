import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { VendorFleetTariffRepository } from '../repositories/vendor-fleet-tariff.repository';

/** Mirrors `controllers/vendors/Fleet/taiffController.js`. */
@Injectable()
export class VendorFleetTariffService {
  constructor(private readonly repo: VendorFleetTariffRepository) {}

  async getTariffByGroupId(groupId: number, vendorId: number) {
    const vendorGroup = await this.repo.findVendorUserByGroupAndVendor(groupId, vendorId);
    const userTypeId = vendorGroup?.userTypeId;

    if (!userTypeId) {
      // Legacy returns 404 with `success: true` — preserved exactly, unusual as it is.
      throw new HttpException({ success: true, message: 'Offerprice Chargers not found', data: [] }, HttpStatus.NOT_FOUND);
    }

    const tariff = await this.repo.findUserTypeWithTariffsById(userTypeId);
    return { success: true, message: 'Tariff fetched chargers successfully', data: tariff };
  }
}
