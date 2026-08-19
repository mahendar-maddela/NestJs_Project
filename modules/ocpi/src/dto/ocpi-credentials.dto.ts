import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsObject, IsOptional, IsString, IsUrl, ValidateNested } from 'class-validator';

class OcpiBusinessDetailsLogoDto {
  @IsOptional() @IsString() url?: string;
}

class OcpiBusinessDetailsDto {
  @IsNotEmpty() @IsString() name: string;

  @IsOptional() @IsString() website?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => OcpiBusinessDetailsLogoDto)
  logo?: OcpiBusinessDetailsLogoDto;
}

class OcpiRoleDto {
  @IsNotEmpty() @IsString() role: string;

  @IsNotEmpty() @IsString() party_id: string;

  @IsNotEmpty() @IsString() country_code: string;

  @IsObject()
  @ValidateNested()
  @Type(() => OcpiBusinessDetailsDto)
  business_details: OcpiBusinessDetailsDto;
}

export class OcpiCredentialsDto {
  @IsNotEmpty() @IsString() token: string;

  @IsNotEmpty() @IsUrl({ require_tld: false }) url: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OcpiRoleDto)
  roles: OcpiRoleDto[];
}
