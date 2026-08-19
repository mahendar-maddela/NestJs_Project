import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UserStationRepository } from '../repositories/user-station.repository';
import { mapConnectorStandard, mapStandardToConnector } from './ocpi-connector.util';

interface BrowseParams {
  latitude?: number;
  longitude?: number;
  limit?: number;
  page?: number;
  search?: string;
  min_power_output?: number;
  stationType?: string;
  connectorTypes?: string;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Driver-facing station/charger browsing + favourites. Mirrors legacy `controllers/APP/stationController.js`. */
@Injectable()
export class UserStationService {
  constructor(private readonly repo: UserStationRepository) {}

  private async resolveRoamingScope(clientId: number) {
    const roamings = await this.repo.findActiveRoamingForImportClient(clientId);
    const pairs = await this.repo.findActiveRoamingClientPairs(clientId);
    const activeExportIds = new Set(pairs.map((p) => p.exportClientId));
    const chargerIds = roamings.filter((r) => activeExportIds.has(r.exportClientId)).map((r) => r.chargerId);
    const exportClientIds = [clientId, ...new Set(roamings.map((r) => r.exportClientId))];
    return { chargerIds, exportClientIds };
  }

  private summarizeStation(station: any, distance: number | null) {
    const connectors = (station.chargers || []).flatMap((c: any) => c.connectors || []);
    const availableChargers = (station.chargers || []).filter((c: any) => c.status === 'Active').length;
    const availableConnectors = connectors.filter((c: any) => c.status === 'Available').length;
    const prices = (station.chargers || []).flatMap((c: any) => [
      ...(c.tariffs || []).map((t: any) => t.price),
      ...(c.roamingTariffs || []).map((t: any) => t.price),
    ]).filter((p: any) => p != null);

    return {
      id: station.id,
      name: station.name,
      distance,
      totalConnectors: connectors.length,
      availableChargers,
      availableConnectors,
      minStartingPrice: prices.length ? Math.min(...prices) : null,
      maxPowerOutput: Math.max(0, ...(station.chargers || []).map((c: any) => c.capacity || 0)),
      connectorTypes: [...new Set(connectors.map((c: any) => c.portType))].join(','),
      stationLocation: station.stationLocation,
    };
  }

  private mapOcpiLocation(location: any, distance: number | null) {
    const connectors = (location.evses || []).flatMap((e: any) => e.connectors || []);
    return {
      id: location.id,
      name: location.name,
      distance,
      stationLocation: { address: location.address, latitude: location.latitude, longitude: location.longitude, city: location.city },
      totalConnectors: (location.evses || []).length,
      availableConnectors: (location.evses || []).filter((e: any) => e.status === 'AVAILABLE').length,
      availableChargers: (location.evses || []).filter((e: any) => e.status === 'AVAILABLE').length,
      minStartingPrice: null,
      maxPowerOutput: connectors.length ? Math.max(...connectors.map((c: any) => (c.max_electric_power || 0) / 1000)) : null,
      connectorTypes: [...new Set(connectors.map((c: any) => mapStandardToConnector(c.standard)))].join(','),
      type: 'OCPI',
    };
  }

  private computeDistance(query: BrowseParams, lat?: string | null, lng?: string | null) {
    if (query.latitude == null || query.longitude == null || !lat || !lng) return null;
    return Number(haversineKm(query.latitude, query.longitude, Number(lat), Number(lng)).toFixed(3));
  }

  /** Mirrors `stationController.js:getAllInternalStation`. */
  async getAllInternalStations(clientId: number, query: BrowseParams) {
    const limit = query.limit || 10;
    const page = query.page || 1;
    const offset = (page - 1) * limit;
    const connectorTypes = query.connectorTypes ? query.connectorTypes.split(',') : undefined;

    const { chargerIds, exportClientIds } = await this.resolveRoamingScope(clientId);

    const stations = await this.repo.findStationsForBrowse({
      exportClientIds,
      search: query.search,
      stationType: query.stationType,
      chargerIds,
      minPowerOutput: query.min_power_output,
      connectorTypes,
      importClientId: clientId,
    });

    const withDistance = stations.map((s) => ({
      station: s,
      distance: this.computeDistance(query, s.stationLocation?.latitude, s.stationLocation?.longitude),
    }));

    if (query.latitude != null) withDistance.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    else withDistance.sort((a, b) => (b.station.createdAt?.getTime() || 0) - (a.station.createdAt?.getTime() || 0));

    const totalRecords = withDistance.length;
    const page_data = withDistance.slice(offset, offset + limit).map(({ station, distance }) => this.summarizeStation(station, distance));

    return {
      success: true,
      message: 'Stations fetched successfully',
      pagination: { totalRecords, totalPages: Math.ceil(totalRecords / limit), currentPage: page, limit },
      data: page_data,
    };
  }

  /** Mirrors `stationController.js:getAllNearbyStations` (internal + OCPI merged). */
  async getAllNearbyStations(clientId: number, query: BrowseParams) {
    const limit = query.limit || 5;
    const page = query.page || 1;
    const offset = (page - 1) * limit;
    const connectorTypes = query.connectorTypes ? query.connectorTypes.split(',') : undefined;

    const { chargerIds, exportClientIds } = await this.resolveRoamingScope(clientId);

    const stations = await this.repo.findStationsForBrowse({
      exportClientIds,
      search: query.search,
      stationType: query.stationType,
      chargerIds,
      minPowerOutput: query.min_power_output,
      connectorTypes,
      importClientId: clientId,
    });

    const internalMapped = stations.map((s) =>
      this.summarizeStation(s, this.computeDistance(query, s.stationLocation?.latitude, s.stationLocation?.longitude)),
    );

    const cpoIds = await this.repo.findConnectedCpoIds(clientId);
    let ocpiMapped: any[] = [];
    if (cpoIds.length) {
      const locations = await this.repo.findOcpiLocations({
        cpoIds,
        search: query.search,
        minPowerOutput: query.min_power_output,
        skip: 0,
        take: limit,
      });
      ocpiMapped = locations.map((l) => this.mapOcpiLocation(l, this.computeDistance(query, l.latitude, l.longitude)));
    }

    const combined = [...internalMapped, ...ocpiMapped];
    if (query.latitude != null) {
      combined.sort((a, b) => {
        if (a.distance == null) return 1;
        if (b.distance == null) return -1;
        if (a.distance === b.distance) return a.id - b.id;
        return a.distance - b.distance;
      });
    }

    const totalRecords = combined.length;
    const paginated = combined.slice(offset, offset + limit);

    return {
      success: true,
      message: 'Stations fetched successfully',
      pagination: { totalRecords, totalPages: Math.ceil(totalRecords / limit), currentPage: page, limit },
      data: paginated,
    };
  }

  /** Mirrors `stationController.js:getAllOCPIStations`. */
  async getAllOcpiStations(clientId: number, query: BrowseParams) {
    const limit = query.limit || 10;
    const page = query.page || 1;
    const offset = (page - 1) * limit;

    const cpoIds = await this.repo.findConnectedCpoIds(clientId);
    const locations = cpoIds.length
      ? await this.repo.findOcpiLocations({ cpoIds, search: query.search, minPowerOutput: query.min_power_output, skip: offset, take: limit })
      : [];

    const data = locations.map((l) => this.mapOcpiLocation(l, this.computeDistance(query, l.latitude, l.longitude)));

    return {
      success: true,
      message: 'Ocpi Stations fetched successfully',
      data,
      pagination: { totalRecords: data.length, totalPages: Math.ceil(data.length / limit), currentPage: page, limit },
    };
  }

  /** Mirrors `stationController.js:getAllStationLocations`. */
  async getAllStationLocations(clientId: number, query: BrowseParams) {
    const connectorTypes = query.connectorTypes ? query.connectorTypes.split(',') : undefined;
    const { chargerIds, exportClientIds } = await this.resolveRoamingScope(clientId);

    const stations = await this.repo.findStationsForBrowse({
      exportClientIds,
      stationType: query.stationType,
      chargerIds,
      minPowerOutput: query.min_power_output,
      connectorTypes,
      importClientId: clientId,
    });

    const plainStations = stations.map((s) => {
      const connectors = (s.chargers || []).flatMap((c: any) => c.connectors || []);
      const statuses = connectors.map((c: any) => c.status);
      let stationStatus = 'Unavailable';
      if (statuses.includes('Available')) stationStatus = 'Available';
      else if (statuses.length && statuses.every((st: string) => st === 'Charging')) stationStatus = 'Charging';

      return {
        id: s.id,
        name: s.name,
        stationUniqueId: s.stationUniqueId,
        stationType: s.stationType,
        stationStatus,
        stationLocation: s.stationLocation,
      };
    });

    const cpoIds = await this.repo.findConnectedCpoIds(clientId);
    let ocpiLocations: any[] = [];
    if (cpoIds.length) {
      const locations = await this.repo.findOcpiLocations({ cpoIds, skip: 0, take: 1000 });
      ocpiLocations = locations.map((l) => ({
        id: l.id,
        name: l.name,
        stationUniqueId: l.locationId,
        stationType: 'Public',
        stationStatus: 'Available',
        stationLocation: { id: l.id, latitude: l.latitude, longitude: l.longitude },
        type: 'OCPI',
        evses: l.evses,
      }));
    }

    return {
      success: true,
      message: 'Station locations fetched successfully',
      data: [...plainStations, ...ocpiLocations],
    };
  }

  /** Mirrors `stationController.js:getChargerByStationId`. */
  async getChargerByStationId(clientId: number, userId: number, stationId: number) {
    const stationForCheck = await this.repo.findStationById(stationId);
    if (!stationForCheck) throw new NotFoundException('Station not found');

    const isRoamingStation = stationForCheck.clientId !== clientId;
    let chargerIds: number[] | undefined;
    if (isRoamingStation) {
      const roamings = await this.repo.findRoamingForCharger(clientId, stationForCheck.clientId);
      chargerIds = roamings.map((r) => r.chargerId);
    }

    const station = await this.repo.findStationDetail(stationId, chargerIds);
    if (!station) throw new NotFoundException('Station not found');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const chargers = (station.chargers || []).map((charger: any) => {
      if (isRoamingStation) {
        return { ...charger, tariff: charger.roamingTariffs || [] };
      }

      const activeUserTypeTariff = (charger.tariffs || []).find((t: any) => {
        if (t.userTypeId == null || !t.userType) return false;
        const vu = (t.userType.vendorUsers || []).find((v: any) => v.userId === userId);
        return Boolean(vu);
      });
      const defaultTariff = (charger.tariffs || []).find((t: any) => t.userTypeId == null);
      const selected = activeUserTypeTariff || defaultTariff;
      return { ...charger, tariff: selected ? [selected] : [] };
    });

    return {
      success: true,
      message: 'Chargers fetched successfully',
      data: { ...station, chargers },
    };
  }

  /** Mirrors `stationController.js:getChargerByChargerId`. */
  async getChargerByChargerId(clientId: number, userId: number, chargerId: number, connectorId?: string) {
    if (!connectorId) throw new BadRequestException('ConnectorId and Charger Id are required in Params !');

    const charger = await this.repo.findChargerWithConnector(chargerId, connectorId);
    if (!charger) throw new NotFoundException('Charger not found');

    const roamingCharger =
      charger.clientId !== clientId ? await this.repo.findActiveRoamingRecord(clientId, charger.id) : null;

    if (charger.clientId !== clientId && !roamingCharger) {
      throw new BadRequestException('You do not have access to this charger');
    }

    let requiredPrice: any = null;
    if (charger.clientId !== clientId) {
      requiredPrice = await this.repo.findRoamingTariff(clientId, charger.clientId, charger.id);
    } else {
      const user = await this.repo.findUserWithVendorType(userId, clientId, charger.vendorId);
      const vu = (user as any)?.vendorUsers?.[0];
      const ut = vu?.userType;

      let activeUserType: any = null;
      if (ut) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const start = ut.startDate ? new Date(ut.startDate).setHours(0, 0, 0, 0) : null;
        const end = ut.endDate ? new Date(ut.endDate).setHours(0, 0, 0, 0) : null;
        if ((!start || today.getTime() >= start) && (!end || today.getTime() <= end)) activeUserType = ut;
      }

      requiredPrice = activeUserType
        ? (await this.repo.findTariff(charger.vendorId, charger.id, activeUserType.id)) ||
          (await this.repo.findTariff(charger.vendorId, charger.id, null))
        : await this.repo.findTariff(charger.vendorId, charger.id, null);
    }

    return {
      success: true,
      message: 'Charger fetched successfully',
      data: { ...charger, tariff: [requiredPrice] },
    };
  }

  /** Mirrors `stationController.js:StationtoggleFavourite`. */
  async toggleFavourite(userId: number, clientId: number, stationId: number) {
    const existing = await this.repo.findFavourite(userId, stationId, clientId);
    if (existing) {
      await this.repo.deleteFavourite(existing.userId, existing.stationId);
      return { success: true, message: 'Station removed from favourites', isFavourite: false };
    }
    await this.repo.createFavourite(userId, stationId, clientId);
    return { success: true, message: 'Station added to favourites', isFavourite: true };
  }

  /** Mirrors `stationController.js:getAllStationFavourites`. */
  async getAllFavourites(userId: number, clientId: number) {
    const favourites = await this.repo.findFavouritesByUser(userId, clientId);
    const data = favourites.map((fav) => ({
      stationId: fav.stationId,
      isFavourite: true,
      station: fav.station,
    }));
    return { success: true, count: data.length, data };
  }
}
