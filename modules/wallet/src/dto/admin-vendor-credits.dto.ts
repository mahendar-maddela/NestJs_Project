import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AddVendorCreditsDto {
  @IsNotEmpty()
  vendorId: number;

  amount: number;

  @IsOptional()
  @IsString()
  note?: string;
}
