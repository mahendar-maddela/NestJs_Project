import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { FleetVehicleGroup } from '../entities/fleet-vehicle-group.entity';
import { VendorUser } from '../../../vendors/src/entities/vendor-user.entity';
import { UserType } from '../../../vendors/src/entities/user-type.entity';
import { Tariff } from '../../../tariffs/src/entities/tariff.entity';
import { Charger } from '../../../chargers/src/entities/charger.entity';
import { Vendor } from '../../../vendors/src/entities/vendor.entity';

/** Mirrors `controllers/Fleet/chargerController.js:getAssociatedChargers`. */
@Injectable()
export class FleetChargerRepository {
  constructor(
    @InjectRepository(FleetVehicleGroup) private readonly groupRepo: Repository<FleetVehicleGroup>,
    @InjectRepository(VendorUser) private readonly vendorUserRepo: Repository<VendorUser>,
    @InjectRepository(UserType) private readonly userTypeRepo: Repository<UserType>,
    @InjectRepository(Tariff) private readonly tariffRepo: Repository<Tariff>,
    @InjectRepository(Charger) private readonly chargerRepo: Repository<Charger>,
    @InjectRepository(Vendor) private readonly vendorRepo: Repository<Vendor>,
  ) {}

  findGroupsByFleetClient(fleetId: number, clientId: number) {
    return this.groupRepo.find({ where: { fleetId, clientId }, select: { id: true, name: true } });
  }

  findVendorUsersByGroupsClient(groupIds: number[], clientId: number) {
    if (!groupIds.length) return Promise.resolve([]);
    return this.vendorUserRepo.find({ where: { fleetGroupId: In(groupIds), clientId } });
  }

  findUserTypesByIdsClient(userTypeIds: number[], clientId: number) {
    if (!userTypeIds.length) return Promise.resolve([]);
    return this.userTypeRepo.find({ where: { id: In(userTypeIds), clientId }, select: { id: true, name: true } });
  }

  findTariffsByUserTypesClient(userTypeIds: number[], clientId: number) {
    if (!userTypeIds.length) return Promise.resolve([]);
    return this.tariffRepo.find({ where: { userTypeId: In(userTypeIds), clientId }, select: { id: true, chargerId: true } });
  }

  findChargersByIdsClient(chargerIds: number[], clientId: number) {
    if (!chargerIds.length) return Promise.resolve([]);
    return this.chargerRepo.find({
      where: { id: In(chargerIds), clientId },
      relations: { station: true, connectors: true },
      select: { id: true, chargerId: true, stationId: true, vendorId: true },
    });
  }

  findVendorsByIdsClient(vendorIds: number[], clientId: number) {
    if (!vendorIds.length) return Promise.resolve([]);
    return this.vendorRepo.find({ where: { id: In(vendorIds), clientId }, select: { id: true, vendor_name: true, vendorUniqueId: true } });
  }
}
