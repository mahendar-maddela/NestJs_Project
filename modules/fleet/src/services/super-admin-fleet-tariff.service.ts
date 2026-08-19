import { Injectable } from '@nestjs/common';
import { AdminTariffRepository } from '../../../tariffs/src/repositories/admin-tariff.repository';

/** Mirrors `controllers/suparAdmin/fleet/tariffController.js`. */
@Injectable()
export class SuperAdminFleetTariffService {
  constructor(private readonly tariffRepo: AdminTariffRepository) {}

  async getTariffsByFleetGroupId(groupId: number) {
    const tariffs = await this.tariffRepo.findVendorUsersByFleetGroupCrossClient(groupId);
    return { success: true, message: 'Tariffs fetched successfully', data: tariffs };
  }

  async getTariffsByUserTypeId(userTypeId: number) {
    const tariff = await this.tariffRepo.findUserTypeWithTariffsChargerStationCrossClient(userTypeId);
    return { success: true, message: 'Tariff fetched chargers successfully', data: tariff };
  }
}
