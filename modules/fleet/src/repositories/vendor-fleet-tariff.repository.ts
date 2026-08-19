import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { VendorUser } from '../../../vendors/src/entities/vendor-user.entity';
import { UserType } from '../../../vendors/src/entities/user-type.entity';

/** Mirrors `controllers/vendors/Fleet/taiffController.js`. */
@Injectable()
export class VendorFleetTariffRepository {
  constructor(
    @InjectRepository(VendorUser) private readonly vendorUserRepo: Repository<VendorUser>,
    @InjectRepository(UserType) private readonly userTypeRepo: Repository<UserType>,
  ) {}

  findVendorUserByGroupAndVendor(fleetGroupId: number, vendorId: number) {
    return this.vendorUserRepo.findOne({ where: { fleetGroupId, vendorId } });
  }

  findUserTypeWithTariffsById(userTypeId: number) {
    return this.userTypeRepo
      .createQueryBuilder('ut')
      .leftJoinAndSelect('ut.tariffs', 'tariffs')
      .leftJoinAndSelect('tariffs.charger', 'charger')
      .leftJoinAndSelect('charger.station', 'station')
      .innerJoinAndSelect('charger.tariff', 'standardTariff', 'standardTariff.userTypeId IS NULL')
      .where('ut.id = :userTypeId', { userTypeId })
      .getRawOne();
  }
}
