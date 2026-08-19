import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateVehicleDto {
  @IsOptional() @IsString() vinNumber?: string;

  @IsNotEmpty() @IsInt() @Type(() => Number) modelId: number;

  @IsOptional() @IsInt() @Type(() => Number) capacityId?: number;

  @IsOptional() @IsNumber() @Type(() => Number) capacity?: number;

  @IsOptional() @IsString() regNo?: string;

  @IsOptional() @IsNumber() @Type(() => Number) maxAmount?: number;

  @IsOptional() @IsNumber() @Type(() => Number) range?: number;
}

export class UpdateVehicleDto {
  @IsOptional() @IsString() vinNumber?: string;

  @IsOptional() @IsInt() @Type(() => Number) modelId?: number;

  @IsOptional() @IsInt() @Type(() => Number) capacityId?: number;

  @IsOptional() @IsNumber() @Type(() => Number) capacity?: number;

  @IsOptional() @IsString() regNo?: string;

  @IsOptional() @IsNumber() @Type(() => Number) maxAmount?: number;

  @IsOptional() @IsNumber() @Type(() => Number) range?: number;
}

export class AutoChargeToggleDto {
  @IsNotEmpty() @IsBoolean() autoCharge: boolean;
}
