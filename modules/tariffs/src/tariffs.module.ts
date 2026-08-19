import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tariff } from './entities/tariff.entity';
import { TariffPriceType } from './entities/tariff-price-type.entity';
import { UserType } from '../../vendors/src/entities/user-type.entity';
import { VendorUser } from '../../vendors/src/entities/vendor-user.entity';
import { User } from '../../users/src/entities/user.entity';
import { Charger } from '../../chargers/src/entities/charger.entity';
import { FleetVehicleGroup } from '../../fleet/src/entities/fleet-vehicle-group.entity';

import { AdminTariffRepository } from './repositories/admin-tariff.repository';
import { AdminTariffService } from './services/admin-tariff.service';
import { AdminTariffController } from './controllers/admin-tariff.controller';
import { VendorTariffRepository } from './repositories/vendor-tariff.repository';
import { VendorTariffService } from './services/vendor-tariff.service';
import { VendorTariffController } from './controllers/vendor-tariff.controller';
import { Feature } from '../../vendors/src/entities/feature.entity';
import { FeaturePermission } from '../../vendors/src/entities/feature-permission.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tariff, TariffPriceType, UserType, VendorUser, User, Charger, FleetVehicleGroup, Feature, FeaturePermission]),
  ],
  controllers: [AdminTariffController, VendorTariffController],
  providers: [AdminTariffRepository, AdminTariffService, VendorTariffRepository, VendorTariffService],
  exports: [TypeOrmModule, AdminTariffRepository, AdminTariffService],
})
export class TariffsModule {}
