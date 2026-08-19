import { Type } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

class OcpiTokenDto {
  @IsNotEmpty() @IsString() uid: string;

  @IsNotEmpty() @IsString() type: string;

  @IsOptional() @IsString() country_code?: string;

  @IsOptional() @IsString() party_id?: string;

  @IsOptional() @IsString() contract_id?: string;

  @IsOptional() @IsString() visual_number?: string;

  @IsOptional() @IsString() issuer?: string;

  @IsOptional() @IsString() group_id?: string;

  @IsOptional() @IsBoolean() valid?: boolean;

  @IsOptional() @IsString() whitelist?: string;

  @IsOptional() @IsString() last_updated?: string;
}

export class OcpiStartCommandDto {
  @IsObject()
  @ValidateNested()
  @Type(() => OcpiTokenDto)
  token: OcpiTokenDto;

  @IsNotEmpty() @IsString() evse_uid: string;

  @IsOptional() @IsString() location_id?: string;

  @IsOptional() @IsString() connector_id?: string;

  @IsNotEmpty() @IsString() response_url: string;

  @IsOptional() @IsString() authorization_reference?: string;
}

export class OcpiStopCommandDto {
  @IsNotEmpty() @IsString() session_id: string;

  @IsNotEmpty() @IsString() response_url: string;
}
