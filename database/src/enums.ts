/**
 * Each "enum" here is a const array (for TypeORM's `@Column({ type: 'enum', enum: X })`,
 * which needs a real runtime list of values) paired with a same-named type alias
 * (`typeof X[number]`) so consuming code keeps using plain string literals exactly like
 * it did against Prisma's generated string-literal-union enum types — no call-site changes.
 */
function values<T extends readonly string[]>(arr: T): T {
  return arr;
}

export const StaffStatus = values(['Active', 'Inactive', 'Suspended'] as const);
export type StaffStatus = (typeof StaffStatus)[number];

export const UserStatus = values(['Active', 'InActive', 'Block'] as const);
export type UserStatus = (typeof UserStatus)[number];

export const VendorStatus = values(['Active', 'InActive'] as const);
export type VendorStatus = (typeof VendorStatus)[number];

export const FleetUserType = values(['FLEET_MANAGER', 'DRIVER', 'EMPLOYEE'] as const);
export type FleetUserType = (typeof FleetUserType)[number];

export const FleetUserStatus = values(['Active', 'InActive', 'Block', 'Suspended'] as const);
export type FleetUserStatus = (typeof FleetUserStatus)[number];

export const ActorType = values(['staff', 'vendor', 'user', 'unuser', 'fleetuser', 'superAdmin'] as const);
export type ActorType = (typeof ActorType)[number];

export const PaymentActorType = values(['User', 'Fleet', 'QRUser'] as const);
export type PaymentActorType = (typeof PaymentActorType)[number];

export const PaymentStatus = values(['Pending', 'Success', 'Failed'] as const);
export type PaymentStatus = (typeof PaymentStatus)[number];

export const TransactionDirection = values(['Credit', 'Debit'] as const);
export type TransactionDirection = (typeof TransactionDirection)[number];

export const PaymentProvider = values(['Razorpay', 'PhonePe', 'Zoho'] as const);
export type PaymentProvider = (typeof PaymentProvider)[number];

export const PaymentPurpose = values(['WalletRecharge', 'PayAndCharge'] as const);
export type PaymentPurpose = (typeof PaymentPurpose)[number];

export const QrCodeStatus = values(['ACTIVE', 'INACTIVE'] as const);
export type QrCodeStatus = (typeof QrCodeStatus)[number];

export const UserLoginChannel = values(['Whatsapp', 'Email', 'Phone'] as const);
export type UserLoginChannel = (typeof UserLoginChannel)[number];

export const WalletType = values(['Vendor', 'User', 'Fleet'] as const);
export type WalletType = (typeof WalletType)[number];

export const WalletStatus = values(['Active', 'Inactive'] as const);
export type WalletStatus = (typeof WalletStatus)[number];

export const WalletTxDirection = values(['Credit', 'Debit'] as const);
export type WalletTxDirection = (typeof WalletTxDirection)[number];

export const WalletSourceType = values(['Credits', 'Wallet', 'Coupon'] as const);
export type WalletSourceType = (typeof WalletSourceType)[number];

export const WalletTxPurpose = values(['Charging', 'Credits', 'Cashback'] as const);
export type WalletTxPurpose = (typeof WalletTxPurpose)[number];

export const CreditStatus = values(['Active', 'Inactive'] as const);
export type CreditStatus = (typeof CreditStatus)[number];

export const StationType = values(['Public', 'Private'] as const);
export type StationType = (typeof StationType)[number];

export const StationStatus = values([
  'Available',
  'Not Available',
  'Under Maintenance',
  'Partial Maintenance',
  'Up-Coming',
  'Out of Service',
] as const);
export type StationStatus = (typeof StationStatus)[number];

export const PowerType = values(['AC', 'DC'] as const);
export type PowerType = (typeof PowerType)[number];

export const ChargerStatus = values(['Active', 'InActive'] as const);
export type ChargerStatus = (typeof ChargerStatus)[number];

export const ConnectorStatus = values([
  'Available',
  'Preparing',
  'Charging',
  'SuspendedEVSE',
  'SuspendedEV',
  'Finishing',
  'Reserved',
  'Unavailable',
  'Faulted',
  'Engaged',
] as const);
export type ConnectorStatus = (typeof ConnectorStatus)[number];

export const SessionStatus = values(['Initiated', 'Started', 'Completed', 'NotStarted', 'Failed'] as const);
export type SessionStatus = (typeof SessionStatus)[number];

export const ChannelSource = values([
  'WEB',
  'IOS',
  'ANDROID',
  'CMS',
  'SERVER',
  'RFID',
  'VID',
  'CHARGER',
  'FM',
  'OCPI',
  'ROAMING',
  'OCPP',
  'QRPAY',
] as const);
export type ChannelSource = (typeof ChannelSource)[number];

export const OutboxCommandStatus = values(['PENDING', 'DISPATCHED', 'ACKNOWLEDGED', 'EXPIRED', 'FAILED'] as const);
export type OutboxCommandStatus = (typeof OutboxCommandStatus)[number];

export const OcpiConnectionStatus = values(['CONNECTED', 'OFFLINE', 'PLANNED', 'SUSPENDED'] as const);
export type OcpiConnectionStatus = (typeof OcpiConnectionStatus)[number];

export const InternalRoamingStatus = values(['ACTIVE', 'BLOCKED', 'PLANNED'] as const);
export type InternalRoamingStatus = (typeof InternalRoamingStatus)[number];

export const CouponStatus = values(['Active', 'Inactive'] as const);
export type CouponStatus = (typeof CouponStatus)[number];

export const ClientAmcStatus = values(['Active', 'Expired'] as const);
export type ClientAmcStatus = (typeof ClientAmcStatus)[number];

export const ClientChargerAmcStatus = values(['Active', 'Expired', 'Onboarded', 'Test', 'MovedOut'] as const);
export type ClientChargerAmcStatus = (typeof ClientChargerAmcStatus)[number];

export const SupportTicketStatus = values(['Pending', 'Open', 'Closed'] as const);
export type SupportTicketStatus = (typeof SupportTicketStatus)[number];

export const AmenityStatus = values(['Active', 'InActive'] as const);
export type AmenityStatus = (typeof AmenityStatus)[number];

export const VehicleModelStatus = values(['Active', 'Inactive'] as const);
export type VehicleModelStatus = (typeof VehicleModelStatus)[number];
