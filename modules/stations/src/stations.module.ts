import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AwsModule } from '@integrations/aws';
import { Station } from './entities/station.entity';
import { Location } from './entities/location.entity';
import { Media } from './entities/media.entity';
import { Amenity } from './entities/amenity.entity';
import { StationAmenity } from './entities/station-amenity.entity';
import { StationFavourite } from './entities/station-favourite.entity';
import { Charger } from '../../chargers/src/entities/charger.entity';
import { Connector } from '../../chargers/src/entities/connector.entity';
import { Vendor } from '../../vendors/src/entities/vendor.entity';
import { VendorTypeAmenity } from '../../vendors/src/entities/vendor-type-amenity.entity';
import { PrefixConfig } from '../../clients/src/entities/prefix-config.entity';
import { InternalRoaming } from '../../ocpi/src/entities/internal-roaming.entity';
import { RoamingClient } from '../../ocpi/src/entities/roaming-client.entity';
import { OcpiCpo } from '../../ocpi/src/entities/ocpi-cpo.entity';
import { OcpiCpoLocation } from '../../ocpi/src/entities/ocpi-cpo-location.entity';
import { RoamingTariff } from '../../ocpi/src/entities/roaming-tariff.entity';
import { User } from '../../users/src/entities/user.entity';
import { Tariff } from '../../tariffs/src/entities/tariff.entity';
import { StationRepository } from './repositories/station.repository';
import { AdminStationRepository } from './repositories/admin-station.repository';
import { AdminAmenityRepository } from './repositories/admin-amenity.repository';
import { UserStationRepository } from './repositories/user-station.repository';
import { VendorStationRepository } from './repositories/vendor-station.repository';
import { SuperAdminStationsService } from './services/super-admin-stations.service';
import { AdminStationsService } from './services/admin-stations.service';
import { AdminAmenityService } from './services/admin-amenity.service';
import { UserStationService } from './services/user-station.service';
import { VendorStationService } from './services/vendor-station.service';
import { SuperAdminStationsController } from './controllers/super-admin-stations.controller';
import { AdminStationsController } from './controllers/admin-stations.controller';
import { AdminAmenityController } from './controllers/admin-amenity.controller';
import { UserStationsController } from './controllers/user-stations.controller';
import { VendorStationsController } from './controllers/vendor-stations.controller';

@Module({
  imports: [
    AwsModule,
    TypeOrmModule.forFeature([
      Station,
      Location,
      Charger,
      Connector,
      Vendor,
      PrefixConfig,
      Media,
      Amenity,
      StationAmenity,
      VendorTypeAmenity,
      InternalRoaming,
      RoamingClient,
      OcpiCpo,
      OcpiCpoLocation,
      StationFavourite,
      User,
      RoamingTariff,
      Tariff,
    ]),
  ],
  controllers: [
    SuperAdminStationsController,
    AdminStationsController,
    AdminAmenityController,
    UserStationsController,
    VendorStationsController,
  ],
  providers: [
    StationRepository,
    AdminStationRepository,
    AdminAmenityRepository,
    UserStationRepository,
    VendorStationRepository,
    SuperAdminStationsService,
    AdminStationsService,
    AdminAmenityService,
    UserStationService,
    VendorStationService,
  ],
  exports: [
    StationRepository,
    AdminStationRepository,
    AdminAmenityRepository,
    UserStationRepository,
    SuperAdminStationsService,
    AdminStationsService,
    AdminAmenityService,
    UserStationService,
  ],
})
export class StationsModule {}
