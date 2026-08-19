import { IsISO8601, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class RenewCpoAmcDto {
  @IsISO8601()
  startDate: string;

  @IsISO8601()
  endDate: string;

  @IsNumber()
  amount: number;

  @IsString()
  @IsNotEmpty()
  chargeType: string;
}
