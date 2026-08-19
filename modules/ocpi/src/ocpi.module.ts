import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OcpiEmsp } from './entities/ocpi-emsp.entity';
import { OcpiCpo } from './entities/ocpi-cpo.entity';
import { OcpiCdr } from './entities/ocpi-cdr.entity';
import { OcpiCpoCdr } from './entities/ocpi-cpo-cdr.entity';
import { OcpiVersion } from './entities/ocpi-version.entity';
import { OcpiVersionEndpoint } from './entities/ocpi-version-endpoint.entity';
import { OcpiCpoVersion } from './entities/ocpi-cpo-version.entity';
import { OcpiCpoVersionEndpoint } from './entities/ocpi-cpo-version-endpoint.entity';
import { OcpiCpoLocation } from './entities/ocpi-cpo-location.entity';
import { OcpiCpoEvse } from './entities/ocpi-cpo-evse.entity';
import { OcpiCpoConnector } from './entities/ocpi-cpo-connector.entity';
import { OcpiCpoTariff } from './entities/ocpi-cpo-tariff.entity';
import { OcpiCpoSession } from './entities/ocpi-cpo-session.entity';
import { OcpiCpoTransaction } from './entities/ocpi-cpo-transaction.entity';
import { OcpiLog } from './entities/ocpi-log.entity';
import { OcpiToken } from './entities/ocpi-token.entity';
import { OcpiPushedTariff } from './entities/ocpi-pushed-tariff.entity';
import { OcpiPushStation } from './entities/ocpi-push-station.entity';
import { InternalRoaming } from './entities/internal-roaming.entity';
import { RoamingClient } from './entities/roaming-client.entity';
import { RoamingTariff } from './entities/roaming-tariff.entity';
import { Charger } from '../../chargers/src/entities/charger.entity';
import { Tariff } from '../../tariffs/src/entities/tariff.entity';
import { DeviceTransaction } from '../../sessions/src/entities/device-transaction.entity';
import { Staff } from '../../clients/src/entities/staff.entity';
import { ClientFeature } from '../../clients/src/entities/client-feature.entity';
import { ClientFeatureMapping } from '../../clients/src/entities/client-feature-mapping.entity';
import { User } from '../../users/src/entities/user.entity';
import { Wallet } from '../../wallet/src/entities/wallet.entity';

import { ChargersModule } from '@modules/chargers/src/chargers.module';
import { SessionsModule } from '../../sessions/src/sessions.module';

import { OcpiRepository } from './repositories/ocpi.repository';
import { AdminEmspRepository } from './repositories/admin-emsp.repository';
import { OcpiCpoPartnerRepository } from './repositories/ocpi-cpo-partner.repository';
import { AdminRoamingRepository } from './repositories/admin-roaming.repository';

import { OcpiService } from './services/ocpi.service';
import { AdminEmspService } from './services/admin-emsp.service';
import { OcpiEmspReceiverService } from './services/ocpi-emsp-receiver.service';
import { AdminCpoService } from './services/admin-cpo.service';
import { AdminRoamingImportService } from './services/admin-roaming-import.service';
import { AdminRoamingExportService } from './services/admin-roaming-export.service';
import { SuperAdminRoamingService } from './services/super-admin-roaming.service';

import { OcpiCpoController } from './controllers/ocpi-cpo.controller';
import { AdminOcpiController } from './controllers/admin-ocpi.controller';
import { OcpiEmspController } from './controllers/ocpi-emsp.controller';
import { AdminOcpiCpoController } from './controllers/admin-ocpi-cpo.controller';
import { AdminRoamingImportClientsController } from './controllers/admin-roaming-import-clients.controller';
import { AdminRoamingImportSessionController } from './controllers/admin-roaming-import-session.controller';
import { AdminRoamingExportClientsController } from './controllers/admin-roaming-export-clients.controller';
import { AdminRoamingExportChargersController } from './controllers/admin-roaming-export-chargers.controller';
import { AdminRoamingExportSessionController } from './controllers/admin-roaming-export-session.controller';
import { SuperAdminRoamingChargerController } from './controllers/super-admin-roaming-charger.controller';
import { SuperAdminRoamingClientsController } from './controllers/super-admin-roaming-clients.controller';
import { AppOcpiCommandService } from './services/app-ocpi-command.service';
import { AppOcpiLocationService } from './services/app-ocpi-location.service';
import { AppOcpiSessionService } from './services/app-ocpi-session.service';
import { AppOcpiCommandController } from './controllers/app-ocpi-command.controller';
import { AppOcpiLocationController } from './controllers/app-ocpi-location.controller';
import { AppOcpiSessionController } from './controllers/app-ocpi-session.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OcpiEmsp,
      OcpiCpo,
      OcpiCdr,
      OcpiCpoCdr,
      OcpiVersion,
      OcpiVersionEndpoint,
      OcpiCpoVersion,
      OcpiCpoVersionEndpoint,
      OcpiCpoLocation,
      OcpiCpoEvse,
      OcpiCpoConnector,
      OcpiCpoTariff,
      OcpiCpoSession,
      OcpiCpoTransaction,
      OcpiLog,
      OcpiToken,
      OcpiPushedTariff,
      OcpiPushStation,
      InternalRoaming,
      RoamingClient,
      RoamingTariff,
      Charger,
      Tariff,
      DeviceTransaction,
      Staff,
      ClientFeature,
      ClientFeatureMapping,
      User,
      Wallet,
    ]),
    ChargersModule,
    SessionsModule,
  ],
  controllers: [
    OcpiCpoController,
    AdminOcpiController,
    OcpiEmspController,
    AdminOcpiCpoController,
    AdminRoamingImportClientsController,
    AdminRoamingImportSessionController,
    AdminRoamingExportClientsController,
    AdminRoamingExportChargersController,
    AdminRoamingExportSessionController,
    SuperAdminRoamingChargerController,
    SuperAdminRoamingClientsController,
    AppOcpiCommandController,
    AppOcpiLocationController,
    AppOcpiSessionController,
  ],
  providers: [
    OcpiRepository,
    AdminEmspRepository,
    OcpiCpoPartnerRepository,
    AdminRoamingRepository,
    OcpiService,
    AdminEmspService,
    OcpiEmspReceiverService,
    AdminCpoService,
    AdminRoamingImportService,
    AdminRoamingExportService,
    SuperAdminRoamingService,
    AppOcpiCommandService,
    AppOcpiLocationService,
    AppOcpiSessionService,
  ],
  exports: [
    TypeOrmModule,
    OcpiRepository,
    AdminEmspRepository,
    OcpiCpoPartnerRepository,
    OcpiService,
    AdminEmspService,
    OcpiEmspReceiverService,
    AdminCpoService,
  ],
})
export class OcpiModule {}
