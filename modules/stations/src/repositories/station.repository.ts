import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Station } from '../entities/station.entity';
import { Media } from '../entities/media.entity';

@Injectable()
export class StationRepository {
  constructor(
    @InjectRepository(Station) private readonly stationRepo: Repository<Station>,
    @InjectRepository(Media) private readonly mediaRepo: Repository<Media>,
  ) {}

  async findById(id: number) {
    return this.stationRepo.findOne({ where: { id } });
  }

  async findSimpleStations(where: FindOptionsWhere<Station> | FindOptionsWhere<Station>[]) {
    return this.stationRepo.find({
      where,
      select: { id: true, name: true, vendorId: true, clientId: true },
      order: { name: 'ASC' },
    });
  }

  async countStations(where: FindOptionsWhere<Station> | FindOptionsWhere<Station>[]) {
    return this.stationRepo.count({ where });
  }

  async findPaginatedStations(where: FindOptionsWhere<Station> | FindOptionsWhere<Station>[], skip: number, take: number) {
    return this.stationRepo.find({
      where,
      skip,
      take,
      select: {
        id: true,
        name: true,
        stationUniqueId: true,
        stationType: true,
        status: true,
        vendorId: true,
        clientId: true,
        createdAt: true,
        updatedAt: true,
      },
      relations: { chargers: { connectors: true }, vendor: true, client: { clientDetails: true } },
      order: { id: 'DESC' },
    });
  }

  async findStationFullDetails(id: number) {
    const [station, media] = await Promise.all([
      this.stationRepo.findOne({
        where: { id },
        relations: { stationLocation: true, stationAmenities: { amenity: true } },
      }),
      this.mediaRepo.find({ where: { mediable_id: id, mediable_type: 'Station' } }),
    ]);

    if (!station) return null;

    const amenities = station.stationAmenities ? station.stationAmenities.map((sa) => sa.amenity) : [];

    return {
      ...station,
      amenities,
      stationMedia: media,
    };
  }
}
