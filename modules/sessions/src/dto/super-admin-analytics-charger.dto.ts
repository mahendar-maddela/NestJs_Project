import { IsOptional, IsNumberString } from 'class-validator';

export class SuperAdminAnalyticsChargerFilterDto {
  @IsOptional() @IsNumberString() stationId?: string;
  @IsOptional() @IsNumberString() chargerId?: string;
  @IsOptional() @IsNumberString() vendorId?: string;
  @IsOptional() @IsNumberString() clientId?: string;
}
