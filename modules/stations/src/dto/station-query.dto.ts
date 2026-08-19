import { IsOptional, IsString, IsNumberString } from 'class-validator';

export class SuperAdminStationQueryDto {
  @IsOptional()
  @IsNumberString()
  vendorType?: string;

  @IsOptional()
  @IsNumberString()
  vendorId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumberString()
  clientId?: string;

  @IsOptional()
  @IsString()
  stationType?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}
