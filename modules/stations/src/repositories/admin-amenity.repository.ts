import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, DeepPartial, FindOptionsWhere, Repository } from 'typeorm';
import { AmenityStatus } from 'database/src';
import { Amenity } from '../entities/amenity.entity';
import { StationAmenity } from '../entities/station-amenity.entity';
import { VendorTypeAmenity } from '../../../vendors/src/entities/vendor-type-amenity.entity';

@Injectable()
export class AdminAmenityRepository {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Amenity) private readonly amenityRepo: Repository<Amenity>,
    @InjectRepository(VendorTypeAmenity) private readonly vendorTypeAmenityRepo: Repository<VendorTypeAmenity>,
    @InjectRepository(StationAmenity) private readonly stationAmenityRepo: Repository<StationAmenity>,
  ) {}

  async createAmenity(data: { name: string; image?: string | null; status?: AmenityStatus }) {
    return this.amenityRepo.save(this.amenityRepo.create(data));
  }

  async findAllAmenities(where: FindOptionsWhere<Amenity> = {}) {
    return this.amenityRepo.find({
      where,
      select: { id: true, name: true, status: true, image: true, createdAt: true, updatedAt: true },
      order: { id: 'DESC' },
    });
  }

  async findAmenityById(id: number) {
    return this.amenityRepo.findOne({
      where: { id },
      relations: { vendorTypeAmenities: true },
    });
  }

  async createAmenityTransaction<T>(fn: (manager: DataSource['manager']) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(fn);
  }

  async deleteAmenity(id: number) {
    return this.amenityRepo.delete({ id });
  }

  async deleteVendorTypeAmenities(amenityId: number) {
    return this.vendorTypeAmenityRepo.delete({ amenityId });
  }

  async deleteStationAmenities(amenityId: number) {
    return this.stationAmenityRepo.delete({ amenityId });
  }
}
