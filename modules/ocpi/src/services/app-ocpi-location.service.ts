import { Injectable, NotFoundException } from '@nestjs/common';
import { OcpiCpoPartnerRepository } from '../repositories/ocpi-cpo-partner.repository';
import { mapStandardToConnector } from '../../../stations/src/services/ocpi-connector.util';

function parseTariffIds(raw: unknown): any[] {
  try {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string' && raw.trim().length) return JSON.parse(raw);
    return [];
  } catch {
    return [];
  }
}

/** Mirrors `controllers/APP/OCPI/locationController.js`. */
@Injectable()
export class AppOcpiLocationService {
  constructor(private readonly repo: OcpiCpoPartnerRepository) {}

  async getOcpiLocationById(id: number) {
    const location: any = await this.repo.findLocationByIdGlobal(id);
    if (!location) {
      throw new NotFoundException({ success: false, message: 'Location not found' });
    }

    const chargers = await Promise.all(
      (location.evses || []).map(async (evse: any) => {
        const connectors = (evse.connectors || []).map((connector: any) => {
          const tariffIds = parseTariffIds(connector.tariff_ids);
          return {
            id: connector.id,
            chargerId: evse.id,
            portType: mapStandardToConnector(connector.standard),
            max_power: connector.max_electric_power || '',
            connectorId: connector.connector_id,
            tariffId: tariffIds[0] || null,
            status: evse.status,
            createdAt: connector.last_updated,
            updatedAt: connector.last_updated,
            currentSoc: null,
            estimatedFullChargeMinutes: null,
          };
        });

        const allTariffIds = (evse.connectors || []).flatMap((c: any) => parseTariffIds(c.tariff_ids));
        let tariff: any[] = [];
        if (allTariffIds.length) {
          const tariffs = await this.repo.findTariffsByIdsAndParty(allTariffIds, location.cpo?.party_id);
          tariff = tariffs.map((t: any) => {
            const elements = parseTariffIds(t.elements);
            const price = elements[0]?.price_components?.[0]?.price ?? null;
            const gst = elements[0]?.price_components?.[0]?.vat ?? null;
            return {
              id: t.id,
              userTypeId: null,
              vendorId: null,
              chargerId: evse.id,
              price,
              gst,
              clientId: null,
              createdAt: t.last_updated || null,
              updatedAt: t.last_updated || null,
              deletedAt: null,
              staffId: null,
            };
          });
        }

        return {
          id: evse.id,
          chargerId: evse.uid,
          capacity: evse.connectors?.[0]?.max_electric_power || null,
          powerType: evse.connectors?.[0]?.power_type,
          status: evse.status,
          connectors,
          tariff,
        };
      }),
    );

    const response = {
      id: location.id,
      name: location.name,
      location: location.city,
      status: 'Available',
      helpNumber: null,
      chargers,
      stationLocation: { id: location.id, address: location.address, city: location.city, latitude: location.latitude, longitude: location.longitude },
      stationMedia: [],
      amenities: [],
      type: 'OCPI',
    };

    return { success: true, message: 'Location fetched successfully', data: response };
  }

  async getOcpiEvseById(uid: string) {
    const evse: any = await this.repo.findEvseByUidGlobal(uid);
    if (!evse) {
      throw new NotFoundException({ success: false, message: 'EVSE not found' });
    }

    const connectors = (evse.connectors || []).map((connector: any) => ({
      id: connector.id,
      connectorId: connector.connector_id,
      portType: connector.standard,
      status: evse.status,
    }));

    let tariff: any[] = [];
    if (evse.connectors?.length) {
      const allTariffIds = evse.connectors.flatMap((c: any) => parseTariffIds(c.tariff_ids));
      if (allTariffIds.length) {
        const tariffs = await this.repo.findTariffsByIdsAndParty(allTariffIds, evse.location?.party_id);
        tariff = tariffs.map((t: any) => {
          const elements = parseTariffIds(t.elements);
          const price = elements[0]?.price_components?.[0]?.price ?? null;
          const gst = elements[0]?.price_components?.[0]?.vat ?? null;
          return {
            id: t.id,
            userTypeId: null,
            vendorId: null,
            chargerId: evse.id,
            price,
            gst,
            clientId: null,
            createdAt: t.last_updated || null,
            updatedAt: t.last_updated || null,
            deletedAt: null,
            staffId: null,
          };
        });
      }
    }

    const response = {
      id: evse.id,
      chargerId: evse.uid,
      capacity: evse.connectors?.[0]?.max_electric_power || null,
      powerType: evse.connectors?.[0]?.power_type,
      status: evse.status,
      connectors,
      station: { id: evse.location?.id, name: evse.location?.name, stationUniqueId: evse.location?.locationId, status: 'Available' },
      tariff,
      type: 'OCPI',
    };

    return { success: true, message: 'Charger fetched successfully', data: response };
  }
}
