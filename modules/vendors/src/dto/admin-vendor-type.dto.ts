import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateVendorTypeDto {
  @IsNotEmpty()
  @IsString()
  name: string;
}

export class UpdateVendorTypeDto {
  @IsOptional()
  @IsString()
  name?: string;
}
