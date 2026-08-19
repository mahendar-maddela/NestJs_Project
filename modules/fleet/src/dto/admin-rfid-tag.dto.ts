import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateRfidTagDto {
  @IsNotEmpty()
  @IsString()
  rfIdTag: string;

  @IsOptional() @IsInt() userId?: number;
  @IsOptional() @IsString() expiryDate?: string;
  @IsOptional() masterRfidTag?: string | number;
  @IsOptional() @IsString() comments?: string;
  @IsOptional() @IsInt() vendorId?: number;
  @IsOptional() @IsNumber() maxAmount?: number;
  @IsOptional() @IsInt() fleetId?: number;
  @IsOptional() @IsInt() fleetGroupId?: number;
}

export class UpdateRfidTagDto {
  @IsOptional() @IsString() rfIdTag?: string;
  @IsOptional() @IsInt() userId?: number;
  @IsOptional() @IsString() expiryDate?: string;
  @IsOptional() masterRfidTag?: string | number;
  @IsOptional() @IsString() comments?: string;
  @IsOptional() @IsInt() vendorId?: number;
  @IsOptional() @IsNumber() maxAmount?: number;
  @IsOptional() @IsInt() fleetId?: number;
  @IsOptional() @IsInt() fleetGroupId?: number;
}

export class RfidTagQueryDto {
  @IsOptional() @IsString() page?: string;
  @IsOptional() @IsString() limit?: string;
  @IsOptional() @IsString() search?: string;
}
