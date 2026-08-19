import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Station } from '../entities/station.entity';
import { Location } from '../entities/location.entity';
import { StationAmenity } from '../entities/station-amenity.entity';
import { Media } from '../entities/media.entity';
import { Amenity } from '../entities/amenity.entity';
import { Vendor } from '../../../vendors/src/entities/vendor.entity';
import { PrefixConfig } from '../../../clients/src/entities/prefix-config.entity';
import { Charger } from '../../../chargers/src/entities/charger.entity';
import { Connector } from '../../../chargers/src/entities/connector.entity';

@Injectable()
export class VendorStationRepository {
  constructor(
    @InjectRepository(Station) private readonly stationRepo: Repository<Station>,
    @InjectRepository(Location) private readonly locationRepo: Repository<Location>,
    @InjectRepository(StationAmenity) private readonly stationAmenityRepo: Repository<StationAmenity>,
    @InjectRepository(Media) private readonly mediaRepo: Repository<Media>,
    @InjectRepository(Amenity) private readonly amenityRepo: Repository<Amenity>,
    @InjectRepository(Vendor) private readonly vendorRepo: Repository<Vendor>,
    @InjectRepository(PrefixConfig) private readonly prefixConfigRepo: Repository<PrefixConfig>,
    @InjectRepository(Charger) private readonly chargerRepo: Repository<Charger>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) { }

  findVendorById(vendorId: number) {
    return this.vendorRepo.findOne({ where: { id: vendorId } });
  }

  countStationsByVendor(vendorId: number) {
    return this.stationRepo.count({ where: { vendorId } });
  }

  countStationsByClient(clientId: number) {
    return this.stationRepo.count({ where: { clientId } });
  }

  findPrefixConfig(clientId: number) {
    return this.prefixConfigRepo.findOne({ where: { clientId }, select: { id: true, clientId: true, station: true } });
  }

  findSimpleStationsByVendor(vendorId: number) {
    return this.stationRepo.find({ where: { vendorId }, select: { id: true, name: true, stationUniqueId: true } });
  }

  findStationByVendorWithChargers(vendorId: number) {
    return this.stationRepo.find({
      where: { vendorId },
      relations: { chargers: true },
      select: {
        id: true, name: true, stationUniqueId: true,
        chargers: { id: true, chargerId: true, stationId: true }
      },
    });
  }
  async findPaginatedStationsWithChargerConnectors(vendorId: number, skip: number, take: number) {
    const [stations, count] = await this.stationRepo.findAndCount({
      where: { vendorId },
      relations: { chargers: { connectors: true } },
      order: { id: 'DESC' },
      skip,
      take,
    });
    return { stations, count };
  }

  findStationById(id: number) {
    return this.stationRepo.findOne({
      where: { id },
      relations: { stationLocation: true, stationAmenities: { amenity: true }, chargers: { connectors: true }, stationMedia: true },
    });
  }

  findMediaByStation(stationId: number) {
    return this.mediaRepo.find({ where: { mediable_id: stationId, mediable_type: 'station' } });
  }

  async deleteStationMedia(stationId: number) {
    await this.mediaRepo.delete({ mediable_id: stationId, mediable_type: 'station' });
  }

  createMedia(data: Partial<Media>) {
    return this.mediaRepo.save(this.mediaRepo.create(data));
  }

  findAmenitiesByIds(ids: number[]) {
    if (!ids.length) return Promise.resolve([]);
    return this.amenityRepo.find({ where: { id: In(ids) } });
  }

  async setStationAmenities(stationId: number, amenityIds: number[]) {
    await this.stationAmenityRepo.delete({ stationId });
    if (amenityIds.length) {
      await this.stationAmenityRepo.save(amenityIds.map((amenityId) => this.stationAmenityRepo.create({ stationId, amenityId })));
    }
  }

  createStation(data: Partial<Station>) {
    return this.stationRepo.save(this.stationRepo.create(data));
  }

  async updateStationUniqueId(id: number, stationUniqueId: string) {
    await this.stationRepo.update(id, { stationUniqueId });
  }

  async updateStation(id: number, data: Partial<Station>) {
    await this.stationRepo.update(id, data as any);
  }

  findLocationByStation(stationId: number) {
    return this.locationRepo.findOne({ where: { stationId } });
  }

  async updateLocation(id: number, data: Partial<Location>) {
    await this.locationRepo.update(id, data as any);
  }

  createLocation(data: Partial<Location>) {
    return this.locationRepo.save(this.locationRepo.create(data));
  }

  async runInTransaction<T>(fn: (manager: DataSource['manager']) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(fn);
  }
}
