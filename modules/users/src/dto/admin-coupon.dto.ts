import { IsArray, IsDateString, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCouponDto {
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsNumber() amount?: number;
  @IsOptional() @IsNumber() cashbackPercent?: number;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsNumber() maxCashbackAmount?: number;
  @IsOptional() @IsArray() userIds?: number[];
}

export class UpdateCouponDto {
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsNumber() amount?: number;
  @IsOptional() @IsNumber() cashbackPercent?: number;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsNumber() maxCashbackAmount?: number;
  @IsOptional() @IsArray() userIds?: number[];
}

export class CouponQueryDto {
  @IsOptional() @IsString() page?: string;
  @IsOptional() @IsString() limit?: string;
}
