import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Charger } from './entities/charger.entity';
import { Connector } from './entities/connector.entity';
import { ChargerSpecification } from './entities/charger-specification.entity';
import { ChargerConfiguration } from './entities/charger-configuration.entity';
import { LogConfiguration } from './entities/log-configuration.entity';
import { Logs } from './entities/logs.entity';
import { ChargingSession } from '../../sessions/src/entities/charging-session.entity';
import { DeviceTransaction } from '../../sessions/src/entities/device-transaction.entity';
import { TransactionDetail } from '../../sessions/src/entities/transaction-detail.entity';
import { Wallet } from '../../wallet/src/entities/wallet.entity';
import { Tariff } from '../../tariffs/src/entities/tariff.entity';
import { User } from '../../users/src/entities/user.entity';
import { VendorUser } from '../../vendors/src/entities/vendor-user.entity';
import { UserType } from '../../vendors/src/entities/user-type.entity';
import { PrefixConfig } from '../../clients/src/entities/prefix-config.entity';
import { ClientDetails } from '../../clients/src/entities/client-details.entity';
import { FleetUser } from '../../fleet/src/entities/fleet-user.entity';
import { FleetUserDetail } from '../../fleet/src/entities/fleet-user-detail.entity';
import { FleetVehicleGroup } from '../../fleet/src/entities/fleet-vehicle-group.entity';
import { Feature } from '../../vendors/src/entities/feature.entity';
import { FeaturePermission } from '../../vendors/src/entities/feature-permission.entity';
import { CpoAmc } from '../../billing/src/entities/cpo-amc.entity';
import { Station } from '../../stations/src/entities/station.entity';
import { Location } from '../../stations/src/entities/location.entity';

import { ChargerRepository } from './repositories/charger.repository';
import { AdminChargerRepository } from './repositories/admin-charger.repository';
import { AdminConnectorRepository } from './repositories/admin-connector.repository';
import { AdminOcppRepository } from './repositories/admin-ocpp.repository';
import { AdminRemoteControlRepository } from './repositories/admin-remote-control.repository';
import { VendorChargerRepository } from './repositories/vendor-charger.repository';
import { ChargerService } from './services/charger.service';
import { ChargerCommandService } from './services/charger-command.service';
import { AdminChargersService } from './services/admin-chargers.service';
import { AdminConnectorService } from './services/admin-connector.service';
import { AdminOcppService } from './services/admin-ocpp.service';
import { AdminRemoteControlService } from './services/admin-remote-control.service';
import { VendorChargerService } from './services/vendor-charger.service';
import { AdminChargersController } from './controllers/admin-chargers.controller';
import { VendorChargersController } from './controllers/vendor-chargers.controller';
import { VendorChargerController } from './controllers/vendor-charger.controller';
import { UserChargersController } from './controllers/user-chargers.controller';
import { FleetChargersController } from './controllers/fleet-chargers.controller';
import { AdminConnectorController } from './controllers/admin-connector.controller';
import { AdminOcppController } from './controllers/admin-ocpp.controller';
import { SuperAdminOcppController } from './controllers/super-admin-ocpp.controller';
import { SuperAdminChargerRepository } from './repositories/super-admin-charger.repository';
import { FleetModule } from '../../fleet/src/fleet.module';
import { FleetRemoteControlRepository } from './repositories/fleet-remote-control.repository';
import { FleetRemoteControlService } from './services/fleet-remote-control.service';
import { FleetRemoteControlController } from './controllers/fleet-remote-control.controller';
import { UserChargerRepository } from './repositories/user-charger.repository';
import { UserChargerService } from './services/user-charger.service';
import { RoamingTariff } from '../../ocpi/src/entities/roaming-tariff.entity';
import { UserRemoteControlRepository } from './repositories/user-remote-control.repository';
import { UserRemoteControlService } from './services/user-remote-control.service';
import { UserRemoteControlController } from './controllers/user-remote-control.controller';

@Module({
  imports: [
    forwardRef(() => FleetModule),
    TypeOrmModule.forFeature([
      Charger,
      Connector,
      ChargerSpecification,
      ChargerConfiguration,
      LogConfiguration,
      Logs,
      ChargingSession,
      DeviceTransaction,
      TransactionDetail,
      Wallet,
      Tariff,
      User,
      VendorUser,
      UserType,
      PrefixConfig,
      ClientDetails,
      FleetUser,
      FleetUserDetail,
      FleetVehicleGroup,
      Feature,
      FeaturePermission,
      CpoAmc,
      Station,
      Location,
      RoamingTariff,
    ]),
  ],
  controllers: [
    AdminChargersController,
    VendorChargersController,
    VendorChargerController,
    UserChargersController,
    FleetChargersController,
    AdminConnectorController,
    AdminOcppController,
    SuperAdminOcppController,
    FleetRemoteControlController,
    UserRemoteControlController,
  ],
  providers: [
    ChargerRepository,
    AdminChargerRepository,
    AdminConnectorRepository,
    AdminOcppRepository,
    AdminRemoteControlRepository,
    VendorChargerRepository,
    ChargerService,
    ChargerCommandService,
    AdminChargersService,
    AdminConnectorService,
    AdminOcppService,
    AdminRemoteControlService,
    VendorChargerService,
    SuperAdminChargerRepository,
    FleetRemoteControlRepository,
    FleetRemoteControlService,
    UserChargerRepository,
    UserChargerService,
    UserRemoteControlRepository,
    UserRemoteControlService,
  ],
  exports: [
    TypeOrmModule,
    ChargerRepository,
    AdminChargerRepository,
    AdminConnectorRepository,
    SuperAdminChargerRepository,
    ChargerService,
    ChargerCommandService,
    AdminChargersService,
    AdminConnectorService,
  ],
})
export class ChargersModule { }
