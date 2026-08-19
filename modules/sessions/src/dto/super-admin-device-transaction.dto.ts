import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from './admin-device-transaction.dto';

export class SuperAdminDeviceTransactionQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  vendorId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  chargerId?: string;

  @IsOptional()
  @IsString()
  stationId?: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  status?: string;
}