import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ChargingSession } from "./entities/charging-session.entity";
import { DeviceTransaction } from "./entities/device-transaction.entity";
import { TransactionDetail } from "./entities/transaction-detail.entity";
import { FleetUser } from "../../fleet/src/entities/fleet-user.entity";
import { Charger } from "../../chargers/src/entities/charger.entity";
import { Feature } from "../../vendors/src/entities/feature.entity";
import { FeaturePermission } from "../../vendors/src/entities/feature-permission.entity";
import { Connector } from "../../chargers/src/entities/connector.entity";
import { OcpiCpoSession } from "../../ocpi/src/entities/ocpi-cpo-session.entity";
import { OcpiCpoTransaction } from "../../ocpi/src/entities/ocpi-cpo-transaction.entity";
import { OcpiCpoEvse } from "../../ocpi/src/entities/ocpi-cpo-evse.entity";
import { WalletTransaction } from "../../wallet/src/entities/wallet-transaction.entity";
import { ClientDetails } from "../../clients/src/entities/client-details.entity";
import { FleetUserDetail } from "../../fleet/src/entities/fleet-user-detail.entity";
import { Vendor } from "../../vendors/src/entities/vendor.entity";

import { SessionRepository } from "./repositories/session.repository";
import { UserDeviceTransactionRepository } from "./repositories/user-device-transaction.repository";
import { UserDeviceTransactionService } from "./services/user-device-transaction.service";
import { WebDeviceTransactionController } from "./controllers/web-device-transaction.controller";
import { AppDeviceTransactionController } from "./controllers/app-device-transaction.controller";
import { AdminDeviceTransactionRepository } from "./repositories/admin-device-transaction.repository";
import { AdminAnalyticsChargerRepository } from "./repositories/admin-analytics-charger.repository";
import { VendorAnalyticsChargerRepository } from "./repositories/vendor-analytics-charger.repository";
import { SessionService } from "./services/session.service";
import { AdminDeviceTransactionService } from "./services/admin-device-transaction.service";
import { AdminAnalyticsChargerService } from "./services/admin-analytics-charger.service";
import { VendorAnalyticsChargerService } from "./services/vendor-analytics-charger.service";
import { AdminSessionsController } from "./controllers/admin-sessions.controller";
import { AdminDeviceTransactionController } from "./controllers/admin-device-transaction.controller";
import { AdminAnalyticsChargerController } from "./controllers/admin-analytics-charger.controller";
import { VendorAnalyticsChargerController } from "./controllers/vendor-analytics-charger.controller";
import { SuperAdminDeviceTransactionController } from "./controllers/super-admin-device-transaction.controller";
import { SuperAdminDeviceTransactionService } from "./services/super-admin-device-transaction.service";
import { SuperAdminAnalyticsChargerController } from "./controllers/super-admin-analytics-charger.controller";
import { SuperAdminAnalyticsChargerService } from "./services/super-admin-analytics-charger.service";
import { InvoiceRepository } from "./repositories/invoice.repository";
import { InvoicePdfService } from "./services/invoice-pdf.service";
import { AppInvoiceService } from "./services/app-invoice.service";
import { AppInvoiceController } from "./controllers/app-invoice.controller";
import { VendorDeviceTransactionRepository } from "./repositories/vendor-device-transaction.repository";
import { VendorDeviceTransactionService } from "./services/vendor-device-transaction.service";
import { VendorDeviceTransactionController } from "./controllers/vendor-device-transaction.controller";


@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChargingSession,
      DeviceTransaction,
      TransactionDetail,
      FleetUser,
      Charger,
      Feature,
      FeaturePermission,
      Connector,
      OcpiCpoSession,
      OcpiCpoTransaction,
      OcpiCpoEvse,
      WalletTransaction,
      ClientDetails,
      FleetUserDetail,
      Vendor,
    ]),
  ],
  controllers: [
    AdminSessionsController,
    AdminDeviceTransactionController,
    AdminAnalyticsChargerController,
    VendorAnalyticsChargerController,
    SuperAdminDeviceTransactionController,
    SuperAdminAnalyticsChargerController,
    WebDeviceTransactionController,
    AppDeviceTransactionController,
    AppInvoiceController,
    VendorDeviceTransactionController,
  ],
  providers: [
    SessionRepository,
    AdminDeviceTransactionRepository,
    AdminAnalyticsChargerRepository,
    VendorAnalyticsChargerRepository,
    SessionService,
    AdminDeviceTransactionService,
    AdminAnalyticsChargerService,
    VendorAnalyticsChargerService,
    SuperAdminDeviceTransactionService,
    SuperAdminAnalyticsChargerService,
    UserDeviceTransactionRepository,
    UserDeviceTransactionService,
    InvoiceRepository,
    InvoicePdfService,
    AppInvoiceService,
    VendorDeviceTransactionRepository,
    VendorDeviceTransactionService,
  ],
  exports: [
    TypeOrmModule,
    SessionRepository,
    SessionService,
    AdminDeviceTransactionService,
    AdminDeviceTransactionRepository,
    InvoiceRepository,
    InvoicePdfService,
  ],
})
export class SessionsModule { }
