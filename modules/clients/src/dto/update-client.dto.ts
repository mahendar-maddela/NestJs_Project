import { IsOptional, IsString, IsEmail, IsBoolean, IsNumber, IsObject, IsArray, IsNotEmpty, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  CreateClientDto,
  CreateClientDetailsDto,
  CreatePaymentConfigDto,
  CreateCredentialConfigDto,
  CreatePrefixConfigDto,
} from './create-client.dto';

function parseJsonIfString(value: any): any {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

export class UpdateClientDto implements Partial<CreateClientDto> {
  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEmail()
  clientContactEmail?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  isTemp?: boolean;

  @IsOptional()
  @IsString()
  status?: any;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined && value !== null && value !== '' ? Number(value) : undefined))
  @IsNumber()
  assignedEmployee?: number;

  @IsOptional()
  @Transform(({ value }) => parseJsonIfString(value))
  @IsObject()
  @ValidateNested()
  @Type(() => CreatePaymentConfigDto)
  paymentConfig?: CreatePaymentConfigDto;

  @IsOptional()
  @Transform(({ value }) => parseJsonIfString(value))
  @IsObject()
  @ValidateNested()
  @Type(() => CreateCredentialConfigDto)
  credentialConfig?: CreateCredentialConfigDto;

  @IsOptional()
  @Transform(({ value }) => parseJsonIfString(value))
  @IsObject()
  @ValidateNested()
  @Type(() => CreatePrefixConfigDto)
  prefixConfig?: CreatePrefixConfigDto;

  @IsOptional()
  @Transform(({ value }) => parseJsonIfString(value))
  @IsObject()
  @ValidateNested()
  @Type(() => CreateClientDetailsDto)
  clientDetails?: CreateClientDetailsDto;

  @IsOptional()
  @Transform(({ value }) => parseJsonIfString(value))
  @IsObject()
  generalAddress?: any;

  @IsOptional()
  @Transform(({ value }) => parseJsonIfString(value))
  @IsObject()
  amcDetails?: any;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.map((x) => Number(x)).filter((n) => !isNaN(n)) : value;
      } catch {
        return value.split(',').map((x: string) => Number(x.trim())).filter((n: number) => !isNaN(n));
      }
    }
    if (Array.isArray(value)) {
      return value.map((x: any) => Number(x)).filter((n: number) => !isNaN(n));
    }
    return value;
  })
  @IsArray()
  features?: number[];
}
