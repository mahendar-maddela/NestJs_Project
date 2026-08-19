import { IsArray, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { VehicleModelStatus } from 'database/src';

export class CapacityItemDto {
  @IsNumber()
  capacity: number;
}

export class CreateVehicleModelDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsInt()
  brandId: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CapacityItemDto)
  capacities?: CapacityItemDto[];
}

export class UpdateVehicleModelDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  brandId?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CapacityItemDto)
  capacities?: CapacityItemDto[];
}

export class UpdateVehicleModelStatusDto {
  @IsNotEmpty()
  @IsIn(VehicleModelStatus)
  status: (typeof VehicleModelStatus)[number];
}
