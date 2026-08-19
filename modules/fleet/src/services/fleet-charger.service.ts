import { Injectable } from '@nestjs/common';
import { FleetChargerRepository } from '../repositories/fleet-charger.repository';

/** Mirrors `controllers/Fleet/chargerController.js`. */
@Injectable()
export class FleetChargerService {
  constructor(private readonly repo: FleetChargerRepository) {}

  async getAssociatedChargers(fleetId: number, clientId: number) {
    const groups = await this.repo.findGroupsByFleetClient(fleetId, clientId);
    const allVendorPrices = await this.repo.findVendorUsersByGroupsClient(
      groups.map((g) => g.id),
      clientId,
    );
    const allUserTypes = await this.repo.findUserTypesByIdsClient(
      allVendorPrices.map((vp) => vp.userTypeId),
      clientId,
    );
    const allTariffs = await this.repo.findTariffsByUserTypesClient(
      allUserTypes.map((ut) => ut.id),
      clientId,
    );
    const chargers = await this.repo.findChargersByIdsClient(
      allTariffs.map((t) => t.chargerId).filter((id): id is number => id != null),
      clientId,
    );
    const vendors = await this.repo.findVendorsByIdsClient(
      chargers.map((c) => c.vendorId).filter((id): id is number => id != null),
      clientId,
    );

    return { success: true, message: 'Chargers fetched successfully', data: { vendors, chargers } };
  }
}
