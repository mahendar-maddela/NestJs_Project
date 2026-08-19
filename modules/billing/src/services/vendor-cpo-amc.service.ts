import { Injectable } from '@nestjs/common';
import { VendorCpoAmcRepository } from '../repositories/vendor-cpo-amc.repository';

/** Mirrors `controllers/vendors/amcController.js`. */
@Injectable()
export class VendorCpoAmcService {
  constructor(private readonly repo: VendorCpoAmcRepository) {}

  async getActiveAmcs(vendorId: number) {
    const today = new Date();
    const amcs = await this.repo.findActiveAmcs(vendorId, today);
    return { success: true, message: 'Active AMC fetched successfully', data: amcs };
  }

  async getUpcomingOrExpiredAmcs(vendorId: number) {
    const today = new Date();
    const oneMonthLater = new Date();
    oneMonthLater.setMonth(today.getMonth() + 1);

    const amcs = await this.repo.findUpcomingOrExpiredAmcs(vendorId, today, oneMonthLater);
    return { success: true, data: amcs };
  }
}
