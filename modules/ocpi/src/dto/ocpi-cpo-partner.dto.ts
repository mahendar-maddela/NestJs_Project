import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

const CONNECTOR_STANDARDS = [
  'CHADEMO', 'CHAOJI', 'DOMESTIC_A', 'DOMESTIC_B', 'DOMESTIC_C', 'DOMESTIC_D', 'DOMESTIC_E', 'DOMESTIC_F', 'DOMESTIC_G',
  'DOMESTIC_H', 'DOMESTIC_I', 'DOMESTIC_J', 'DOMESTIC_K', 'DOMESTIC_L', 'DOMESTIC_M', 'DOMESTIC_N', 'DOMESTIC_O',
  'GBT_AC', 'GBT_DC', 'IEC_60309_2_single_16', 'IEC_60309_2_three_16', 'IEC_60309_2_three_32', 'IEC_60309_2_three_64',
  'IEC_62196_T1', 'IEC_62196_T1_COMBO', 'IEC_62196_T2', 'IEC_62196_T2_COMBO', 'IEC_62196_T3A', 'IEC_62196_T3C',
  'NEMA_5_20', 'NEMA_6_30', 'NEMA_6_50', 'NEMA_10_30', 'NEMA_10_50', 'NEMA_14_30', 'NEMA_14_50',
  'PANTOGRAPH_BOTTOM_UP', 'PANTOGRAPH_TOP_DOWN', 'TESLA_R', 'TESLA_S',
];
const EVSE_STATUSES = ['AVAILABLE', 'BLOCKED', 'CHARGING', 'INOPERATIVE', 'OUTOFORDER', 'PLANNED', 'REMOVED', 'RESERVED', 'UNKNOWN'];
const POWER_TYPES = ['AC_1_PHASE', 'AC_2_PHASE', 'AC_2_PHASE_SPLIT', 'AC_3_PHASE', 'DC', 'AC'];
const TOKEN_TYPES = ['AD_HOC_USER', 'APP_USER', 'OTHER', 'RFID', 'WHITELIST'];
const AUTH_METHODS = ['AUTH_REQUEST', 'COMMAND', 'WHITELIST'];
const SESSION_STATUSES = ['ACTIVE', 'COMPLETED', 'INVALID', 'PENDING', 'RESERVATION'];

class CoordinatesDto {
  @IsNotEmpty() @IsNumber() @Type(() => Number) latitude: number;

  @IsNotEmpty() @IsNumber() @Type(() => Number) longitude: number;
}

class OcpiConnectorDto {
  @IsNotEmpty() @IsString() id: string;

  @IsIn(CONNECTOR_STANDARDS) standard: string;

  @IsIn(['SOCKET', 'CABLE']) format: string;

  @IsIn(POWER_TYPES) power_type: string;

  @IsNotEmpty() @IsInt() max_voltage: number;

  @IsNotEmpty() @IsInt() max_amperage: number;

  @IsOptional() @IsInt() max_electric_power?: number;

  @IsOptional() @IsArray() tariff_ids?: string[];

  @IsISO8601() last_updated: string;
}

class OcpiEvseDto {
  @IsNotEmpty() @IsString() uid: string;

  @IsOptional() @IsString() evse_id?: string;

  @IsIn(EVSE_STATUSES) status: string;

  @IsOptional() @IsArray() capabilities?: string[];

  @IsOptional() @IsString() floor_level?: string;

  @IsOptional() @IsString() physical_reference?: string;

  @IsArray() @ValidateNested({ each: true }) @Type(() => OcpiConnectorDto) connectors: OcpiConnectorDto[];

  @IsISO8601() last_updated: string;
}

export class OcpiLocationPutDto {
  @IsNotEmpty() @IsString() id: string;

  @IsNotEmpty() @IsBoolean() publish: boolean;

  @IsOptional() @IsString() name?: string;

  @IsNotEmpty() @IsString() address: string;

  @IsNotEmpty() @IsString() city: string;

  @IsOptional() @IsString() postal_code?: string;

  @IsOptional() @IsString() state?: string;

  @IsNotEmpty() @IsString() country: string;

  @IsObject() @ValidateNested() @Type(() => CoordinatesDto) coordinates: CoordinatesDto;

  @IsOptional() @IsIn(['ON_STREET', 'OFF_STREET', 'UNDERGROUND', 'PARKING_GARAGE']) parking_type?: string;

  @IsArray() @ValidateNested({ each: true }) @Type(() => OcpiEvseDto) evses: OcpiEvseDto[];

  @IsNotEmpty() @IsString() time_zone: string;

  @IsISO8601() last_updated: string;
}

export class OcpiLocationPatchDto {
  @IsOptional() @IsBoolean() publish?: boolean;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() postal_code?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsObject() coordinates?: { latitude: number; longitude: number };
  @IsOptional() @IsString() parking_type?: string;
  @IsOptional() @IsString() time_zone?: string;
  @IsISO8601() last_updated: string;
}

export class OcpiEvsePatchDto {
  @IsOptional() @IsIn(EVSE_STATUSES) status?: string;
  @IsOptional() @IsArray() capabilities?: string[];
  @IsOptional() @IsString() floor_level?: string;
  @IsOptional() @IsString() physical_reference?: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsISO8601() last_updated: string;
}

export class OcpiConnectorPatchDto {
  @IsOptional() @IsIn(CONNECTOR_STANDARDS) standard?: string;
  @IsOptional() @IsIn(['SOCKET', 'CABLE']) format?: string;
  @IsOptional() @IsIn(POWER_TYPES) power_type?: string;
  @IsOptional() @IsInt() max_voltage?: number;
  @IsOptional() @IsInt() max_amperage?: number;
  @IsOptional() @IsInt() max_electric_power?: number;
  @IsOptional() @IsArray() tariff_ids?: string[];
  @IsISO8601() last_updated: string;
}

class PriceComponentDto {
  @IsNotEmpty() @IsString() type: string;
  @IsNotEmpty() @IsNumber() price: number;
  @IsOptional() @IsNumber() vat?: number;
  @IsNotEmpty() @IsInt() step_size: number;
}

class TariffElementDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => PriceComponentDto) price_components: PriceComponentDto[];

  @IsOptional() @IsObject() restrictions?: Record<string, unknown>;
}

export class OcpiTariffPutDto {
  @IsNotEmpty() @IsString() id: string;

  @IsISO8601() last_updated: string;

  @IsNotEmpty() @IsString() currency: string;

  @IsOptional() @IsString() type?: string;

  @IsOptional() @IsArray() tariff_alt_text?: { language: string; text: string }[];

  @IsOptional() @IsString() tariff_alt_url?: string;

  @IsOptional() @IsNumber() min_price?: number;

  @IsOptional() @IsNumber() max_price?: number;

  @IsOptional() @IsISO8601() start_date_time?: string;

  @IsOptional() @IsISO8601() end_date_time?: string;

  @IsArray() @ValidateNested({ each: true }) @Type(() => TariffElementDto) elements: TariffElementDto[];
}

class CdrTokenDto {
  @IsNotEmpty() @IsString() country_code: string;
  @IsNotEmpty() @IsString() party_id: string;
  @IsNotEmpty() @IsString() uid: string;
  @IsIn(TOKEN_TYPES) type: string;
  @IsOptional() @IsString() contract_id?: string;
}

export class OcpiSessionPutDto {
  @IsNotEmpty() @IsString() country_code: string;
  @IsNotEmpty() @IsString() party_id: string;
  @IsNotEmpty() @IsString() id: string;
  @IsISO8601() start_date_time: string;
  @IsOptional() @IsISO8601() end_date_time?: string;
  @IsNotEmpty() @IsNumber() kwh: number;
  @IsObject() @ValidateNested() @Type(() => CdrTokenDto) cdr_token: CdrTokenDto;
  @IsIn(AUTH_METHODS) auth_method: string;
  @IsNotEmpty() @IsString() authorization_reference: string;
  @IsOptional() @IsString() meter_id?: string;
  @IsNotEmpty() @IsString() location_id: string;
  @IsNotEmpty() @IsString() evse_uid: string;
  @IsNotEmpty() @IsString() connector_id: string;
  @IsNotEmpty() @IsString() currency: string;
  @IsOptional() @IsArray() charging_periods?: unknown[];
  @IsObject() total_cost: { excl_vat: number; incl_vat: number; vat?: number };
  @IsIn(SESSION_STATUSES) status: string;
  @IsISO8601() last_updated: string;
}

export class OcpiSessionPatchDto {
  @IsOptional() @IsNumber() kwh?: number;
  @IsOptional() @IsIn(SESSION_STATUSES) status?: string;
  @IsOptional() @IsISO8601() end_date_time?: string;
  @IsOptional() @IsArray() charging_periods?: unknown[];
  @IsOptional() @IsObject() total_cost?: { excl_vat: number; incl_vat: number; vat?: number; currency?: string };
  @IsISO8601() last_updated: string;
}

class CdrLocationDto {
  @IsNotEmpty() @IsString() id: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() postal_code?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsObject() coordinates?: { latitude: string; longitude: string };
  @IsNotEmpty() @IsString() evse_uid: string;
  @IsNotEmpty() @IsString() evse_id: string;
  @IsNotEmpty() @IsString() connector_id: string;
  @IsNotEmpty() @IsString() connector_standard: string;
  @IsOptional() @IsString() connector_format?: string;
  @IsOptional() @IsString() connector_power_type?: string;
}

export class OcpiCdrPostDto {
  @IsNotEmpty() @IsString() country_code: string;
  @IsNotEmpty() @IsString() party_id: string;
  @IsNotEmpty() @IsString() id: string;
  @IsISO8601() start_date_time: string;
  @IsISO8601() end_date_time: string;
  @IsOptional() @IsString() session_id?: string;
  @IsObject() @ValidateNested() @Type(() => CdrTokenDto) cdr_token: CdrTokenDto;
  @IsIn(AUTH_METHODS) auth_method: string;
  @IsOptional() @IsString() authorization_reference?: string;
  @IsObject() @ValidateNested() @Type(() => CdrLocationDto) cdr_location: CdrLocationDto;
  @IsOptional() @IsString() meter_id?: string;
  @IsNotEmpty() @IsString() currency: string;
  @IsOptional() @IsArray() tariffs?: unknown[];
  @IsArray() charging_periods: unknown[];
  @IsObject() total_cost: { excl_vat: number; incl_vat: number; vat?: number };
  @IsOptional() @IsObject() signed_data?: Record<string, unknown>;
  @IsOptional() @IsObject() total_fixed_cost?: Record<string, unknown>;
  @IsNotEmpty() @IsNumber() total_energy: number;
  @IsOptional() @IsObject() total_energy_cost?: Record<string, unknown>;
  @IsNotEmpty() @IsNumber() total_time: number;
  @IsOptional() @IsObject() total_time_cost?: Record<string, unknown>;
  @IsOptional() @IsNumber() total_parking_time?: number;
  @IsOptional() @IsObject() total_parking_cost?: Record<string, unknown>;
  @IsOptional() @IsObject() total_reservation_cost?: Record<string, unknown>;
  @IsOptional() @IsString() remark?: string;
  @IsOptional() @IsString() invoice_reference_id?: string;
  @IsOptional() @IsBoolean() credit?: boolean;
  @IsOptional() @IsString() credit_reference_id?: string;
  @IsOptional() @IsBoolean() home_charging_compensation?: boolean;
  @IsISO8601() last_updated: string;
}

export class OcpiCommandResultDto {
  @IsNotEmpty() @IsString() result: string;

  @IsArray() message: { language: string; text: string }[];
}
