import { Injectable, NotFoundException } from '@nestjs/common';
import { AdminTariffRepository } from '../../../tariffs/src/repositories/admin-tariff.repository';

/** Mirrors `controllers/Fleet/tariffController.js`. */
@Injectable()
export class FleetTariffService {
  constructor(private readonly tariffRepo: AdminTariffRepository) {}

  async getFleetGroupWithVendorUsers(fleetGroupId: number, clientId: number) {
    const fleetGroup = await this.tariffRepo.findFleetGroupWithVendorUsersClient(fleetGroupId, clientId);
    if (!fleetGroup) {
      throw new NotFoundException({ success: false, message: 'Fleet vehicle group not found' });
    }
    return { success: true, message: 'Fleet group with vendor users fetched successfully', data: fleetGroup };
  }

  async getTariffByUserTypeId(userTypeId: number, clientId: number) {
    const tariff: any = await this.tariffRepo.findUserTypeFullTariffChainClient(userTypeId, clientId);
    // Legacy's `User_Type` association is aliased `vendors` despite being a single belongsTo — renamed to match the response field name.
    if (tariff && 'vendor' in tariff) {
      tariff.vendors = tariff.vendor;
      delete tariff.vendor;
    }
    return { success: true, message: 'Tariff fetched chargers successfully', data: tariff };
  }
}
