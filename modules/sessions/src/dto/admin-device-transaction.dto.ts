import { IsOptional, IsNumberString, IsString } from 'class-validator';

export class DeviceTransactionQueryDto {
  @IsOptional() @IsNumberString() page?: string;
  @IsOptional() @IsNumberString() limit?: string;
  @IsOptional() @IsString() vendorType?: string;
  @IsOptional() @IsNumberString() vendorId?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsNumberString() chargerId?: string;
  @IsOptional() @IsNumberString() stationId?: string;
}

export class PaginationQueryDto {
  @IsOptional() @IsNumberString() page?: string;
  @IsOptional() @IsNumberString() limit?: string;
}
