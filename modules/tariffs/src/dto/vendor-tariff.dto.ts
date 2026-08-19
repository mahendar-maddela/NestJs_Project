import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsISO8601, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class VendorTariffChargerInputDto {
  @IsNotEmpty()
  @IsInt()
  chargerId: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsNumber()
  gst?: number;
}

export class CreateVendorTariffDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsISO8601()
  startDate: string;

  @IsNotEmpty()
  @IsISO8601()
  endDate: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => VendorTariffChargerInputDto)
  chargers: VendorTariffChargerInputDto[];
}

export class UpdateVendorTariffDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsISO8601()
  startDate: string;

  @IsNotEmpty()
  @IsISO8601()
  endDate: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => VendorTariffChargerInputDto)
  chargers: VendorTariffChargerInputDto[];
}

export class UpdateStandardChargerTariffDto {
  @IsNotEmpty()
  price: number | string;

  @IsOptional()
  gst?: number | string;
}

/** Legacy has `validateCreateUserVendorUserType` for this route but never wires it — body is unvalidated. */
export class AssignVendorUserOrGroupDto {
  /** Preserves legacy's exact (typo'd) body key `userTypeI`, already used by the deployed frontend. */
  userTypeI: string;
  userIds?: string[];
  groupIds?: number[];
}

