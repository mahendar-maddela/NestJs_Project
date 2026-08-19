import { IsOptional, IsNumberString } from 'class-validator';

export class AnalyticsChargerFilterDto {
  @IsOptional() @IsNumberString() stationId?: string;
  @IsOptional() @IsNumberString() chargerId?: string;
  @IsOptional() @IsNumberString() vendorId?: string;
}
