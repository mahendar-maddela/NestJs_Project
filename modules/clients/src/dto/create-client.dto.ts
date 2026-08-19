import { IsString, IsEmail, IsOptional, IsBoolean, IsNumber, IsObject, IsArray, IsNotEmpty, Length, Matches, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';

const URL_REGEX = /^https:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

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

export class CreateClientDetailsDto {
  @IsNotEmpty()
  @IsString()
  companyName: string;

  @IsNotEmpty()
  @IsString()
  contactEmail: string;

  @IsNotEmpty()
  @IsString()
  contactPhone: string;

  @IsNotEmpty()
  @IsString()
  gst: string;

  @IsNotEmpty()
  @IsString()
  address: string;

  @IsNotEmpty()
  @IsString()
  businessUrl: string;

  @IsNotEmpty()
  @IsString()
  logoUrl: string;

  @IsNotEmpty()
  @IsString()
  primaryColor: string;

  @IsOptional()
  @Matches(URL_REGEX, { message: 'Fleet url must be a valid base URL without path or trailing slash' })
  fleetUrl?: string;

  @IsNotEmpty()
  @IsString()
  csmsUrl: string;

  @IsNotEmpty()
  @Matches(URL_REGEX, { message: 'CPO url must be a valid base URL without path or trailing slash' })
  cpoUrl: string;

  @IsNotEmpty()
  @IsString()
  brandName: string;

  @IsOptional()
  @IsString()
  clientType?: string;

  @IsOptional()
  @IsString()
  userPortalUrl?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  zipCode?: string;

  @IsNotEmpty()
  @IsString()
  termsAndConditionsUrl: string;

  @IsNotEmpty()
  @IsString()
  privacyPolicyUrl: string;

  @IsNotEmpty()
  @IsString()
  refundPolicyUrl: string;

  @IsOptional()
  @IsString()
  supportUrl?: string;

  @IsNotEmpty()
  @IsString()
  shippingPolicyUrl: string;

  @IsOptional()
  @IsString()
  mobileAppDeepLinkUrl?: string;

  @IsNotEmpty()
  @Length(3, 3, { message: 'party Id must be exactly 3 characters' })
  partyId: string;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined && value !== null && value !== '' ? Number(value) : undefined))
  @IsNumber()
  preConvDeductionAmount?: number;
}

export class CreatePaymentConfigDto {
  @IsNotEmpty()
  @IsString()
  provider: string;

  @IsNotEmpty()
  @IsString()
  keyId: string;

  @IsNotEmpty()
  @IsString()
  secretToken: string;
}

export class CreateCredentialConfigDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  emailHost?: string;

  @IsOptional()
  @IsString()
  mailPassKey?: string;

  @IsNotEmpty()
  userLoginType: any;

  @IsNotEmpty()
  @IsString()
  authKey: string;

  @IsNotEmpty()
  @IsString()
  template: string;
}

export class CreatePrefixConfigDto {
  @IsNotEmpty()
  @IsString()
  @Length(3, 4, { message: 'Session prefix must be between 3 and 4 characters' })
  session: string;

  @IsNotEmpty()
  @IsString()
  @Length(2, 4, { message: 'Coupon prefix must be between 2 and 4 characters' })
  coupon: string;

  @IsNotEmpty()
  @IsString()
  @Length(3, 4, { message: 'Wallet prefix must be between 3 and 4 characters' })
  wallet: string;

  @IsNotEmpty()
  @IsString()
  @Length(3, 4, { message: 'CPO prefix must be between 3 and 4 characters' })
  cpo: string;

  @IsNotEmpty()
  @IsString()
  @Length(3, 4, { message: 'Station prefix must be between 3 and 4 characters' })
  station: string;

  @IsNotEmpty()
  @IsString()
  @Length(3, 4, { message: 'Fleet prefix must be between 3 and 4 characters' })
  fleet: string;

  @IsNotEmpty()
  @IsString()
  @Length(3, 5, { message: 'User prefix must be between 3 and 5 characters' })
  user: string;

  @IsNotEmpty()
  @IsString()
  @Length(3, 4, { message: 'Employee prefix must be between 3 and 4 characters' })
  employee: string;

  @IsNotEmpty()
  @IsString()
  @Length(3, 4, { message: 'Driver prefix must be between 3 and 4 characters' })
  driver: string;

  @IsNotEmpty()
  @IsString()
  @Length(3, 4, { message: 'Vehicle group prefix must be between 3 and 4 characters' })
  vehicleGroup: string;
}

export class CreateClientDto {
  @IsNotEmpty()
  @IsString()
  first_name: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsOptional()
  @IsEmail()
  clientContactEmail?: string;

  @IsNotEmpty()
  @IsString()
  phone: string;

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

  @IsNotEmpty()
  @Transform(({ value }) => parseJsonIfString(value))
  @IsObject()
  @ValidateNested()
  @Type(() => CreatePaymentConfigDto)
  paymentConfig: CreatePaymentConfigDto;

  @IsNotEmpty()
  @Transform(({ value }) => parseJsonIfString(value))
  @IsObject()
  @ValidateNested()
  @Type(() => CreateCredentialConfigDto)
  credentialConfig: CreateCredentialConfigDto;

  @IsNotEmpty()
  @Transform(({ value }) => parseJsonIfString(value))
  @IsObject()
  @ValidateNested()
  @Type(() => CreatePrefixConfigDto)
  prefixConfig: CreatePrefixConfigDto;

  @IsNotEmpty()
  @Transform(({ value }) => parseJsonIfString(value))
  @IsObject()
  @ValidateNested()
  @Type(() => CreateClientDetailsDto)
  clientDetails: CreateClientDetailsDto;

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
