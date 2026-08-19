import { IsString, IsEmail, IsOptional, IsBoolean, IsNumber, IsNumberString } from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsNumber()
  roleId?: number;

  @IsOptional()
  @IsNumber()
  departId?: number;

  @IsString()
  empId: string;
}

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsNumber()
  roleId?: number;

  @IsOptional()
  @IsNumber()
  departId?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class EmployeeQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}
