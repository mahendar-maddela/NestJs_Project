import { IsOptional, IsNumberString, IsString, IsIn } from 'class-validator';

export class RevenueFilterQueryDto {
  @IsOptional() @IsNumberString() stationId?: string;
  @IsOptional() @IsNumberString() chargerId?: string;
  @IsOptional() @IsNumberString() vendorId?: string;
}

export class MonthlyRevenueQueryDto extends RevenueFilterQueryDto {
  @IsOptional() @IsNumberString() month?: string;
  @IsOptional() @IsNumberString() year?: string;
}

export class YearlyRevenueQueryDto extends RevenueFilterQueryDto {
  @IsOptional() @IsNumberString() year?: string;
}

export class EachMonthAnalyticsQueryDto extends RevenueFilterQueryDto {
  @IsOptional() @IsNumberString() year?: string;
  @IsOptional() @IsNumberString() fleetId?: string;
}

export class DownloadReportsQueryDto {
  @IsOptional() vendorIds?: string;
  @IsOptional() stationIds?: string;
  @IsOptional() chargerIds?: string;
  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() endDate?: string;
  @IsOptional() @IsIn(['true', 'false']) applyGst?: string;
}
