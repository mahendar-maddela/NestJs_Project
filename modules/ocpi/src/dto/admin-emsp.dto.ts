import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateEmspDto {
  @IsNotEmpty() @IsString() party_id: string;

  @IsNotEmpty() @IsString() country_code: string;

  @IsNotEmpty() @IsString() business_name: string;

  @IsNotEmpty() @IsString() url: string;

  @IsOptional() @IsString() token_b?: string;
}

export class UpdateEmspDto {
  @IsOptional() @IsString() business_name?: string;

  @IsOptional() @IsString() url?: string;

  @IsOptional() @IsString() token_b?: string;

  @IsOptional() @IsString() status?: string;

  @IsOptional() @IsString() party_id?: string;
}

export class SendVersionsEndpointsDto {
  @IsNotEmpty() @IsString() version: string;
}

export class PushTariffToEmspDto {
  @IsNotEmpty() @IsInt() @Type(() => Number) chargerId: number;

  @IsOptional() @IsInt() @Type(() => Number) roamingTariffId?: number;

  @IsNotEmpty() @IsNumber() @Type(() => Number) roamingPrice: number;

  @IsNotEmpty() @IsNumber() @Type(() => Number) roamingGst: number;
}

export class PushLocationToEmspDto {
  @IsArray() @IsInt({ each: true }) @Type(() => Number) chargerIds: number[];

  @IsNotEmpty() @IsInt() @Type(() => Number) stationId: number;
}

export class DownloadSessionsDto {
  @IsOptional() @IsArray() @Type(() => Number) vendorIds?: number[];

  @IsOptional() @IsArray() @Type(() => Number) stationIds?: number[];

  @IsOptional() @IsArray() @Type(() => Number) chargerIds?: number[];

  @IsOptional() @IsString() startDate?: string;

  @IsOptional() @IsString() endDate?: string;
}

export class SendCdrDto {
  @IsNotEmpty() @IsString() sessionId: string;
}
