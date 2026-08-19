import { IsISO8601, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class SuperAdminClientAmcQueryDto {
  search?: string;
  status?: string;
}

export class RenewClientAmcDto {
  @IsNotEmpty()
  clientId: number;

  @IsNotEmpty()
  @IsISO8601()
  startDate: string;

  @IsNotEmpty()
  @IsISO8601()
  endDate: string;

  @IsOptional() @IsNumber() standard_amc_hours?: number;
  @IsOptional() @IsNumber() charger_amc_count?: number;
  @IsOptional() @IsNumber() chargers_for_increment?: number;
  @IsOptional() @IsNumber() increment_hours?: number;
}
