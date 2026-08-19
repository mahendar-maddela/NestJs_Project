import { IsArray, IsEmail, IsIn, IsInt, IsOptional, IsString, IsNotEmpty } from 'class-validator';
import { StaffStatus } from 'database/src';

export class CreateStaffDto {
  @IsOptional() @IsString() first_name?: string;
  @IsOptional() @IsString() last_name?: string;
  @IsNotEmpty() @IsEmail() email: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() aadhar?: string;
  @IsOptional() @IsString() pan?: string;
  @IsOptional() @IsArray() roleId?: number | number[];
}

export class UpdateStaffDto {
  @IsOptional() @IsString() first_name?: string;
  @IsOptional() @IsString() last_name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() aadhar?: string;
  @IsOptional() @IsString() pan?: string;
  @IsOptional() @IsIn(StaffStatus) status?: (typeof StaffStatus)[number];
  @IsOptional() roleId?: number | number[];
}

export class StaffQueryDto {
  @IsOptional() @IsString() page?: string;
  @IsOptional() @IsString() limit?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() status?: string;
}
