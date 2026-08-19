import { Injectable, NotFoundException } from '@nestjs/common';
import { UserChargerRepository } from '../repositories/user-charger.repository';

function toDateOnly(d: Date | string | null | undefined): number | null {
  return d ? new Date(d).setHours(0, 0, 0, 0) : null;
}

/** Mirrors `controllers/Web/chargerController.js`. Shared by the web and app (driver) actors. */
@Injectable()
export class UserChargerService {
  constructor(private readonly repo: UserChargerRepository) {}

  async getChargerDetails(chargerRef: number, clientId: number, userId: number | undefined) {
    const charger = await this.repo.findChargerByIdClientWithStationConnectors(chargerRef, clientId);
    if (!charger) {
      throw new NotFoundException({ message: 'Charger not found' });
    }

    const user = await this.repo.findUserWithVendorUserTypes(userId, clientId, charger.vendorId);

    let activeUserType: any = null;
    const ut = (user as any)?.vendorUserTypes?.[0]?.userType;
    if (ut) {
      const today = toDateOnly(new Date());
      const start = toDateOnly(ut.startDate);
      const end = toDateOnly(ut.endDate);
      if ((!start || today! >= start) && (!end || today! <= end)) {
        activeUserType = ut;
      }
    }

    let requiredPrice: any = null;
    if (activeUserType) {
      requiredPrice = await this.repo.findTariff(charger.vendorId, charger.id, activeUserType.id);
      if (!requiredPrice) {
        requiredPrice = await this.repo.findTariff(charger.vendorId, charger.id, null);
      }
    } else {
      requiredPrice = await this.repo.findTariff(charger.vendorId, charger.id, null);
    }

    if (!requiredPrice) {
      throw new NotFoundException({ message: 'No matching tariff price type found for user' });
    }

    return { success: true, message: 'Charger details fetched successfully', data: { charger, price: requiredPrice } };
  }

  async getAllStationWithSearch(clientId: number, search: string | undefined) {
    const stationIds = await this.repo.findStationIdsBySearch(search || '');
    if (!stationIds || stationIds.length === 0) {
      return { status: true, message: 'No stations found', data: [] };
    }

    const stations = await this.repo.findStationsByIdsClient(
      stationIds.map((s) => s.id),
      clientId,
    );

    return { status: true, message: 'Stations retrieved successfully', data: stations };
  }

  async getWithChargerIdDetails(chargerId: string, clientId: number) {
    const charger = await this.repo.findChargerByChargerIdClient(chargerId, clientId);
    if (!charger) {
      throw new NotFoundException({ success: false, message: 'Charger not found' });
    }
    return { success: true, message: 'Charger details fetched successfully', data: charger };
  }
}
