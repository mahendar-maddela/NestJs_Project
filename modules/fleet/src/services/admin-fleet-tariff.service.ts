import { Injectable } from '@nestjs/common';
import { AdminTariffRepository } from '../../../tariffs/src/repositories/admin-tariff.repository';

/** Mirrors `controllers/admin/fleet/tariffController.js`. */
@Injectable()
export class AdminFleetTariffService {
  constructor(private readonly tariffRepo: AdminTariffRepository) {}

  async getAllTariffsByGroupId(fleetGroupId: number, clientId: number) {
    const tariffs = await this.tariffRepo.findVendorUsersByFleetGroupAndClient(fleetGroupId, clientId);
    return { success: true, message: 'Tariffs fetched successfully', data: tariffs };
  }

  async getTariffByUserTypeId(userTypeId: number, clientId: number) {
    const tariff = await this.tariffRepo.findUserTypeWithTariffsById(userTypeId, clientId);
    if (!tariff) {
      return { success: true, message: 'Tariff fetched chargers successfully', data: null };
    }

    const chargerIds = (tariff.tariffs || []).map((t: any) => t.charger?.id).filter(Boolean);
    const standardTariffs = chargerIds.length
      ? await Promise.all(chargerIds.map((id: number) => this.tariffRepo.findStandardTariffByCharger(id)))
      : [];
    const standardByCharger = new Map<number, any>();
    chargerIds.forEach((id: number, i: number) => {
      if (standardTariffs[i]) standardByCharger.set(id, standardTariffs[i]);
    });

    const data = {
      ...tariff,
      tariffs: (tariff.tariffs || []).map((t: any) => ({
        ...t,
        charger: t.charger
          ? { ...t.charger, tariff: standardByCharger.has(t.charger.id) ? [standardByCharger.get(t.charger.id)] : [] }
          : t.charger,
      })),
    };

    return { success: true, message: 'Tariff fetched chargers successfully', data };
  }
}
