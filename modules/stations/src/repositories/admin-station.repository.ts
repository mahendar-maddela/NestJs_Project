import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, DeepPartial, FindOptionsWhere, Repository } from 'typeorm';
import { StationStatus } from 'database/src';
import { Vendor } from '../../../vendors/src/entities/vendor.entity';
import { Station } from '../entities/station.entity';
import { Media } from '../entities/media.entity';
import { PrefixConfig } from '../../../clients/src/entities/prefix-config.entity';

@Injectable()
export class AdminStationRepository {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Vendor) private readonly vendorRepo: Repository<Vendor>,
    @InjectRepository(Station) private readonly stationRepo: Repository<Station>,
    @InjectRepository(PrefixConfig) private readonly prefixConfigRepo: Repository<PrefixConfig>,
    @InjectRepository(Media) private readonly mediaRepo: Repository<Media>,
  ) { }

  async findVendorByIdAndClient(vendorId: number, clientId: number) {
    return this.vendorRepo.findOne({ where: { id: vendorId, clientId } });
  }

  async countVendorStations(vendorId: number, clientId: number) {
    return this.stationRepo.count({ where: { vendorId, clientId } });
  }

  async countClientStations(clientId: number) {
    return this.stationRepo.count({ where: { clientId } });
  }

  async findPrefixConfig(clientId: number) {
    return this.prefixConfigRepo.findOne({ where: { clientId } });
  }

  async findStationByIdAndClient(id: number, clientId: number) {
    return this.stationRepo.findOne({
      where: { id, clientId },
      relations: {
        chargers: { connectors: true },
        stationLocation: true,
        vendor: true,
        amenities: true,
        stationMedia: true,
      },
    });
  }

  async findMediaByStation(stationId: number) {
    return this.mediaRepo.find({ where: { mediable_id: stationId, mediable_type: 'station' } });
  }

  async createStationTransaction<T>(fn: (manager: DataSource['manager']) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(fn);
  }

  async findPaginatedStations(where: FindOptionsWhere<Station> | FindOptionsWhere<Station>[], skip: number, limit: number) {
    const [stations, count] = await this.stationRepo.findAndCount({
      where,
      skip,
      take: limit,
      select: { id: true, name: true, stationUniqueId: true, stationType: true, status: true, clientId: true },
      relations: { chargers: { connectors: true }, vendor: true },
      order: { id: 'DESC' },
    });

    return { count, stations };
  }

  async findSimpleStations(where: FindOptionsWhere<Station> | FindOptionsWhere<Station>[]) {
    const stations = await this.stationRepo.find({
      where,
      select: { id: true, name: true, vendorId: true, clientId: true },
      order: { id: 'DESC' },
    });
    return { count: stations.length, stations };
  }

  async updateStationStatus(id: number, status: StationStatus) {
    await this.stationRepo.update({ id }, { status });
    return this.stationRepo.findOne({ where: { id } });
  }

  async deleteStation(id: number) {
    return this.stationRepo.delete({ id });
  }

  async deleteStationMedia(stationId: number) {
    return this.mediaRepo.delete({ mediable_id: stationId, mediable_type: 'station' });
  }
}
