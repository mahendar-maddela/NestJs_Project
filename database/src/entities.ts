/**
 * Explicit, exhaustive import of every entity class in the project.
 *
 * Why this exists instead of a runtime glob: each app (apps/api, apps/ocpp-gateway,
 * apps/scheduler) is built independently via its own `nest build <app>`, and tsc only
 * emits the files an app's own import graph actually reaches — apps/api happens to
 * import nearly every feature module directly so its compiled dist/ looks complete by
 * accident, but apps/scheduler and apps/ocpp-gateway only import a handful of modules,
 * so a __dirname-relative glob over their own dist tree silently misses every entity
 * that isn't transitively reachable from what they import — including entities other
 * entities relate to via string-based relations (e.g. Staff -> 'ClientFeature'), which
 * then fail at TypeORM metadata-build time with "Entity metadata for X#y was not
 * found", not at compile time. Real ES imports here are always followed by tsc
 * regardless of which app compiles this file, so every app's dist/ ends up with every
 * entity class, and TypeORM's entities array below is deterministic instead of
 * dependent on which app happens to import it.
 *
 * Keep this in sync when adding a new *.entity.ts file — nothing enforces it automatically.
 */

import { ForgotPassword } from '../../modules/auth/src/entities/forgot-password.entity';
import { Otp } from '../../modules/auth/src/entities/otp.entity';
import { RefreshToken } from '../../modules/auth/src/entities/refresh-token.entity';
import { UnverifiedUser } from '../../modules/auth/src/entities/unverified-user.entity';
import { ClientAmc } from '../../modules/billing/src/entities/client-amc.entity';
import { ClientChargerAmc } from '../../modules/billing/src/entities/client-charger-amc.entity';
import { CpoAmc } from '../../modules/billing/src/entities/cpo-amc.entity';
import { CpoSettlement } from '../../modules/billing/src/entities/cpo-settlement.entity';
import { ChargerConfiguration } from '../../modules/chargers/src/entities/charger-configuration.entity';
import { ChargerSpecification } from '../../modules/chargers/src/entities/charger-specification.entity';
import { Charger } from '../../modules/chargers/src/entities/charger.entity';
import { Connector } from '../../modules/chargers/src/entities/connector.entity';
import { LogConfiguration } from '../../modules/chargers/src/entities/log-configuration.entity';
import { Logs } from '../../modules/chargers/src/entities/logs.entity';
import { AuditLog } from '../../modules/clients/src/entities/audit-log.entity';
import { ClientDetails } from '../../modules/clients/src/entities/client-details.entity';
import { ClientFeatureMapping } from '../../modules/clients/src/entities/client-feature-mapping.entity';
import { ClientFeature } from '../../modules/clients/src/entities/client-feature.entity';
import { CredentialConfig } from '../../modules/clients/src/entities/credential-config.entity';
import { IndividualPermission } from '../../modules/clients/src/entities/individual-permission.entity';
import { LoginTrack } from '../../modules/clients/src/entities/login-track.entity';
import { Permission } from '../../modules/clients/src/entities/permission.entity';
import { PrefixConfig } from '../../modules/clients/src/entities/prefix-config.entity';
import { RolePermission } from '../../modules/clients/src/entities/role-permission.entity';
import { Role } from '../../modules/clients/src/entities/role.entity';
import { StaffRole } from '../../modules/clients/src/entities/staff-role.entity';
import { Staff } from '../../modules/clients/src/entities/staff.entity';
import { FleetDriverVehicle } from '../../modules/fleet/src/entities/fleet-driver-vehicle.entity';
import { FleetUserDetail } from '../../modules/fleet/src/entities/fleet-user-detail.entity';
import { FleetUser } from '../../modules/fleet/src/entities/fleet-user.entity';
import { FleetVehicleGroup } from '../../modules/fleet/src/entities/fleet-vehicle-group.entity';
import { RfidTag } from '../../modules/fleet/src/entities/rfid-tag.entity';
import { Notification } from '../../modules/notifications/src/entities/notification.entity';
import { InternalRoaming } from '../../modules/ocpi/src/entities/internal-roaming.entity';
import { OcpiCdr } from '../../modules/ocpi/src/entities/ocpi-cdr.entity';
import { OcpiCpoCdr } from '../../modules/ocpi/src/entities/ocpi-cpo-cdr.entity';
import { OcpiCpoConnector } from '../../modules/ocpi/src/entities/ocpi-cpo-connector.entity';
import { OcpiCpoEvse } from '../../modules/ocpi/src/entities/ocpi-cpo-evse.entity';
import { OcpiCpoLocation } from '../../modules/ocpi/src/entities/ocpi-cpo-location.entity';
import { OcpiCpoSession } from '../../modules/ocpi/src/entities/ocpi-cpo-session.entity';
import { OcpiCpoTariff } from '../../modules/ocpi/src/entities/ocpi-cpo-tariff.entity';
import { OcpiCpoTransaction } from '../../modules/ocpi/src/entities/ocpi-cpo-transaction.entity';
import { OcpiCpoVersionEndpoint } from '../../modules/ocpi/src/entities/ocpi-cpo-version-endpoint.entity';
import { OcpiCpoVersion } from '../../modules/ocpi/src/entities/ocpi-cpo-version.entity';
import { OcpiCpo } from '../../modules/ocpi/src/entities/ocpi-cpo.entity';
import { OcpiEmsp } from '../../modules/ocpi/src/entities/ocpi-emsp.entity';
import { OcpiLog } from '../../modules/ocpi/src/entities/ocpi-log.entity';
import { OcpiPushStation } from '../../modules/ocpi/src/entities/ocpi-push-station.entity';
import { OcpiPushedTariff } from '../../modules/ocpi/src/entities/ocpi-pushed-tariff.entity';
import { OcpiToken } from '../../modules/ocpi/src/entities/ocpi-token.entity';
import { OcpiVersionEndpoint } from '../../modules/ocpi/src/entities/ocpi-version-endpoint.entity';
import { OcpiVersion } from '../../modules/ocpi/src/entities/ocpi-version.entity';
import { RoamingClient } from '../../modules/ocpi/src/entities/roaming-client.entity';
import { RoamingTariff } from '../../modules/ocpi/src/entities/roaming-tariff.entity';
import { PayChargeQRCode } from '../../modules/payments/src/entities/pay-charge-qr-code.entity';
import { PaymentConfig } from '../../modules/payments/src/entities/payment-config.entity';
import { PaymentTransaction } from '../../modules/payments/src/entities/payment-transaction.entity';
import { Transaction } from '../../modules/payments/src/entities/transaction.entity';
import { MonthlyAnalytics } from '../../modules/reports/src/entities/monthly-analytics.entity';
import { ChargingSession } from '../../modules/sessions/src/entities/charging-session.entity';
import { DeviceTransaction } from '../../modules/sessions/src/entities/device-transaction.entity';
import { TransactionDetail } from '../../modules/sessions/src/entities/transaction-detail.entity';
import { Amenity } from '../../modules/stations/src/entities/amenity.entity';
import { Location } from '../../modules/stations/src/entities/location.entity';
import { Media } from '../../modules/stations/src/entities/media.entity';
import { StationAmenity } from '../../modules/stations/src/entities/station-amenity.entity';
import { StationFavourite } from '../../modules/stations/src/entities/station-favourite.entity';
import { Station } from '../../modules/stations/src/entities/station.entity';
import { SuperAdmin } from '../../modules/super-admin/src/entities/super-admin.entity';
import { SuperDepartment } from '../../modules/super-admin/src/entities/super-department.entity';
import { SuperPermission } from '../../modules/super-admin/src/entities/super-permission.entity';
import { SuperRolePermission } from '../../modules/super-admin/src/entities/super-role-permission.entity';
import { SuperRole } from '../../modules/super-admin/src/entities/super-role.entity';
import { ClientSupportAssignment } from '../../modules/support/src/entities/client-support-assignment.entity';
import { ClientSupport } from '../../modules/support/src/entities/client-support.entity';
import { SupportTicketMessage } from '../../modules/support/src/entities/support-ticket-message.entity';
import { TariffPriceType } from '../../modules/tariffs/src/entities/tariff-price-type.entity';
import { Tariff } from '../../modules/tariffs/src/entities/tariff.entity';
import { Brand } from '../../modules/users/src/entities/brand.entity';
import { CouponUser } from '../../modules/users/src/entities/coupon-user.entity';
import { Coupon } from '../../modules/users/src/entities/coupon.entity';
import { User } from '../../modules/users/src/entities/user.entity';
import { VehicleCapacity } from '../../modules/users/src/entities/vehicle-capacity.entity';
import { VehicleModel } from '../../modules/users/src/entities/vehicle-model.entity';
import { Vehicle } from '../../modules/users/src/entities/vehicle.entity';
import { Address } from '../../modules/vendors/src/entities/address.entity';
import { FeaturePermission } from '../../modules/vendors/src/entities/feature-permission.entity';
import { Feature } from '../../modules/vendors/src/entities/feature.entity';
import { Platform } from '../../modules/vendors/src/entities/platform.entity';
import { UserType } from '../../modules/vendors/src/entities/user-type.entity';
import { VendorBankDetails } from '../../modules/vendors/src/entities/vendor-bank-details.entity';
import { VendorPlatform } from '../../modules/vendors/src/entities/vendor-platform.entity';
import { VendorRole } from '../../modules/vendors/src/entities/vendor-role.entity';
import { VendorTypeAmenity } from '../../modules/vendors/src/entities/vendor-type-amenity.entity';
import { VendorType } from '../../modules/vendors/src/entities/vendor-type.entity';
import { VendorUser } from '../../modules/vendors/src/entities/vendor-user.entity';
import { Vendor } from '../../modules/vendors/src/entities/vendor.entity';
import { Credit } from '../../modules/wallet/src/entities/credit.entity';
import { WalletTransaction } from '../../modules/wallet/src/entities/wallet-transaction.entity';
import { Wallet } from '../../modules/wallet/src/entities/wallet.entity';

export const ALL_ENTITIES = [
  ForgotPassword,
  Otp,
  RefreshToken,
  UnverifiedUser,
  ClientAmc,
  ClientChargerAmc,
  CpoAmc,
  CpoSettlement,
  ChargerConfiguration,
  ChargerSpecification,
  Charger,
  Connector,
  LogConfiguration,
  Logs,
  AuditLog,
  ClientDetails,
  ClientFeatureMapping,
  ClientFeature,
  CredentialConfig,
  IndividualPermission,
  LoginTrack,
  Permission,
  PrefixConfig,
  RolePermission,
  Role,
  StaffRole,
  Staff,
  FleetDriverVehicle,
  FleetUserDetail,
  FleetUser,
  FleetVehicleGroup,
  RfidTag,
  Notification,
  InternalRoaming,
  OcpiCdr,
  OcpiCpoCdr,
  OcpiCpoConnector,
  OcpiCpoEvse,
  OcpiCpoLocation,
  OcpiCpoSession,
  OcpiCpoTariff,
  OcpiCpoTransaction,
  OcpiCpoVersionEndpoint,
  OcpiCpoVersion,
  OcpiCpo,
  OcpiEmsp,
  OcpiLog,
  OcpiPushStation,
  OcpiPushedTariff,
  OcpiToken,
  OcpiVersionEndpoint,
  OcpiVersion,
  RoamingClient,
  RoamingTariff,
  PayChargeQRCode,
  PaymentConfig,
  PaymentTransaction,
  Transaction,
  MonthlyAnalytics,
  ChargingSession,
  DeviceTransaction,
  TransactionDetail,
  Amenity,
  Location,
  Media,
  StationAmenity,
  StationFavourite,
  Station,
  SuperAdmin,
  SuperDepartment,
  SuperPermission,
  SuperRolePermission,
  SuperRole,
  ClientSupportAssignment,
  ClientSupport,
  SupportTicketMessage,
  TariffPriceType,
  Tariff,
  Brand,
  CouponUser,
  Coupon,
  User,
  VehicleCapacity,
  VehicleModel,
  Vehicle,
  Address,
  FeaturePermission,
  Feature,
  Platform,
  UserType,
  VendorBankDetails,
  VendorPlatform,
  VendorRole,
  VendorTypeAmenity,
  VendorType,
  VendorUser,
  Vendor,
  Credit,
  WalletTransaction,
  Wallet,
];
