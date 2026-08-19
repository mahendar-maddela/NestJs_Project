import { IsOptional, IsString } from 'class-validator';

export class SuperAdminUserQueryDto {
  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  vendorId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  clientId?: string;
}

export class UpdateAutoChargeDto {
  isAutoChargeEnabled: boolean;
  userId: number;
}

export class UpdateUserStatusDto {
  status: string;
}
