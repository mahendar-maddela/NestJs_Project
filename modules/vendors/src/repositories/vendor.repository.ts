import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Vendor } from '../entities/vendor.entity';
import { UserType } from '../entities/user-type.entity';
import { Permission } from '../../../clients/src/entities/permission.entity';
import { Amenity } from '../../../stations/src/entities/amenity.entity';

@Injectable()
export class VendorRepository {
  constructor(
    @InjectRepository(Vendor)
    private readonly vendorRepo: Repository<Vendor>,
    @InjectRepository(UserType)
    private readonly userTypeRepo: Repository<UserType>,
    @InjectRepository(Amenity)
    private readonly amenityRepo: Repository<Amenity>,
    private readonly dataSource: DataSource,
  ) {}

  async findById(id: number) {
    return this.vendorRepo.findOne({ where: { id } });
  }

  async findAll() {
    return this.vendorRepo.find();
  }

  async findUserTypesByVendorId(vendorId: number) {
    return this.userTypeRepo.find({ where: { vendorId } });
  }

  async findVendorPermissions() {
    return this.dataSource.getRepository(Permission).find({ where: { type: 'vendor' } });
  }

  async findActiveAmenities() {
    return this.amenityRepo.find({ where: { status: 'Active' } });
  }
}
