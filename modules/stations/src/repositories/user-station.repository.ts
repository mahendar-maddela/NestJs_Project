import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, In, IsNull, Not, Repository } from 'typeorm';
import { Station } from '../entities/station.entity';
import { Media } from '../entities/media.entity';
import { StationFavourite } from '../entities/station-favourite.entity';
import { InternalRoaming } from '../../../ocpi/src/entities/internal-roaming.entity';
import { RoamingClient } from '../../../ocpi/src/entities/roaming-client.entity';
import { OcpiCpo } from '../../../ocpi/src/entities/ocpi-cpo.entity';
import { OcpiCpoLocation } from '../../../ocpi/src/entities/ocpi-cpo-location.entity';
import { RoamingTariff } from '../../../ocpi/src/entities/roaming-tariff.entity';
import { Charger } from '../../../chargers/src/entities/charger.entity';
import { User } from '../../../users/src/entities/user.entity';
import { Tariff } from '../../../tariffs/src/entities/tariff.entity';

/** Driver-facing station/charger browsing + favourites. Mirrors legacy `controllers/APP/stationController.js`. */
@Injectable()
export class UserStationRepository {
  constructor(
    @InjectRepository(Station) private readonly stationRepo: Repository<Station>,
    @InjectRepository(InternalRoaming) private readonly internalRoamingRepo: Repository<InternalRoaming>,
    @InjectRepository(RoamingClient) private readonly roamingClientRepo: Repository<RoamingClient>,
    @InjectRepository(OcpiCpo) private readonly ocpiCpoRepo: Repository<OcpiCpo>,
    @InjectRepository(OcpiCpoLocation) private readonly ocpiCpoLocationRepo: Repository<OcpiCpoLocation>,
    @InjectRepository(Media) private readonly mediaRepo: Repository<Media>,
    @InjectRepository(StationFavourite) private readonly stationFavouriteRepo: Repository<StationFavourite>,
    @InjectRepository(Charger) private readonly chargerRepo: Repository<Charger>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(RoamingTariff) private readonly roamingTariffRepo: Repository<RoamingTariff>,
    @InjectRepository(Tariff) private readonly tariffRepo: Repository<Tariff>,
  ) {}

  async findActiveRoamingForImportClient(clientId: number) {
    return this.internalRoamingRepo.find({ where: { importClientId: clientId, status: 'ACTIVE' } });
  }

  async findActiveRoamingClientPairs(clientId: number) {
    return this.roamingClientRepo.find({ where: { importClientId: clientId, status: 'ACTIVE' } });
  }

  async findStationsForBrowse(params: {
    exportClientIds: number[];
    search?: string;
    stationType?: string;
    chargerIds: number[];
    minPowerOutput?: number;
    connectorTypes?: string[];
    importClientId: number;
  }) {
    const where: FindOptionsWhere<Station> | FindOptionsWhere<Station>[] = params.search
      ? [
          { clientId: In(params.exportClientIds), status: Not('Out of Service' as const), name: ILike(`%${params.search}%`) },
          {
            clientId: In(params.exportClientIds),
            status: Not('Out of Service' as const),
            stationLocation: { address: ILike(`%${params.search}%`) },
          },
        ]
      : {
          clientId: In(params.exportClientIds),
          status: Not('Out of Service' as const),
          ...(params.stationType && { stationType: params.stationType as any }),
        };

    const stations = await this.stationRepo.find({
      where,
      relations: {
        stationLocation: true,
        chargers: { connectors: true, tariff: true, roamingTariffs: true },
      },
      order: { createdAt: 'DESC' },
    });

    const chargerIdSet = new Set(params.chargerIds);
    return stations.map((station) => ({
      ...station,
      chargers: (station.chargers || []).filter((charger) => {
        const inScope = charger.clientId === params.importClientId || chargerIdSet.has(charger.id);
        if (!inScope) return false;
        if (params.minPowerOutput && (charger.capacity ?? 0) < params.minPowerOutput) return false;
        if (params.connectorTypes?.length) {
          const types = (charger.connectors || []).map((c) => c.portType);
          if (!params.connectorTypes.some((t) => types.includes(t))) return false;
        }
        return true;
      }),
    }));
  }

  async findConnectedCpoIds(clientId: number) {
    const cpos = await this.ocpiCpoRepo.find({ where: { clientId, status: 'CONNECTED' } });
    return cpos.map((c) => c.id);
  }

  async findOcpiLocations(params: { cpoIds: number[]; search?: string; minPowerOutput?: number; skip: number; take: number }) {
    const where: FindOptionsWhere<OcpiCpoLocation> | FindOptionsWhere<OcpiCpoLocation>[] = params.search
      ? [
          { cpoId: In(params.cpoIds), name: ILike(`%${params.search}%`) },
          { cpoId: In(params.cpoIds), address: ILike(`%${params.search}%`) },
        ]
      : { cpoId: In(params.cpoIds) };

    const locations = await this.ocpiCpoLocationRepo.find({
      where,
      relations: { evses: { connectors: true } },
      skip: params.skip,
      take: params.take,
    });

    return locations.map((location) => ({
      ...location,
      evses: (location.evses || [])
        .filter((evse) => evse.status !== 'REMOVED')
        .map((evse) => ({
          ...evse,
          connectors: params.minPowerOutput
            ? (evse.connectors || []).filter((c) => (c.max_electric_power ?? 0) >= params.minPowerOutput! * 1000)
            : evse.connectors,
        })),
    }));
  }

  async findStationById(id: number) {
    return this.stationRepo.findOne({ where: { id }, select: { id: true, clientId: true } });
  }

  async findStationDetail(id: number, chargerIds?: number[]) {
    const station = await this.stationRepo.findOne({
      where: { id },
      select: { id: true, name: true, location: true, status: true, helpNumber: true },
      relations: {
        stationLocation: true,
        chargers: {
          connectors: true,
          tariff: { userType: { vendorUsers: true } },
          roamingTariffs: true,
        },
        stationAmenities: { amenity: true },
      },
    });

    if (!station) return null;
    if (chargerIds) {
      station.chargers = (station.chargers || []).filter((c) => chargerIds.includes(c.id));
    }
    return station;
  }

  async findStationMedia(stationId: number) {
    return this.mediaRepo.find({ where: { mediable_id: stationId, mediable_type: 'Station' } });
  }

  async findRoamingForCharger(importClientId: number, exportClientId: number) {
    return this.internalRoamingRepo.find({ where: { importClientId, exportClientId, status: 'ACTIVE' } });
  }

  async findChargerWithConnector(chargerId: number, connectorId?: string) {
    const charger = await this.chargerRepo.findOne({
      where: { id: chargerId },
      select: { id: true, chargerId: true, capacity: true, powerType: true, status: true, vendorId: true, clientId: true },
      relations: { connectors: true, station: true },
    });
    if (!charger) return null;
    if (connectorId) {
      charger.connectors = (charger.connectors || []).filter((c) => c.connectorId === connectorId);
    }
    return charger;
  }

  async findActiveRoamingRecord(importClientId: number, chargerId: number) {
    return this.internalRoamingRepo.findOne({ where: { importClientId, chargerId, status: 'ACTIVE' } });
  }

  async findUserWithVendorType(userId: number, clientId: number, vendorId: number | null) {
    const user = await this.userRepo.findOne({
      where: { id: userId, clientId },
      select: { id: true, userId: true },
      relations: { vendorUsers: { userType: true } },
    });
    if (!user) return null;
    if (vendorId) {
      (user as any).vendorUsers = ((user as any).vendorUsers || []).filter((vu: any) => vu.vendorId === vendorId);
    }
    return user;
  }

  async findRoamingTariff(importClientId: number, exportClientId: number, chargerId: number) {
    return this.roamingTariffRepo.findOne({ where: { importClientId, clientId: exportClientId, chargerId } });
  }

  async findTariff(vendorId: number | null, chargerId: number, userTypeId: number | null) {
    return this.tariffRepo.findOne({
      where: { vendorId: vendorId ?? undefined, chargerId, userTypeId: userTypeId ?? IsNull() },
    });
  }

  // ---- Favourites ----

  async findFavourite(userId: number, stationId: number, clientId: number) {
    return this.stationFavouriteRepo.findOne({ where: { userId, stationId, clientId } });
  }

  async createFavourite(userId: number, stationId: number, clientId: number) {
    return this.stationFavouriteRepo.save(this.stationFavouriteRepo.create({ userId, stationId, clientId }));
  }

  async deleteFavourite(userId: number, stationId: number) {
    return this.stationFavouriteRepo.delete({ userId, stationId });
  }

  async findFavouritesByUser(userId: number, clientId: number) {
    return this.stationFavouriteRepo.find({
      where: { userId, clientId },
      relations: { station: { stationLocation: true } },
    });
  }
}
