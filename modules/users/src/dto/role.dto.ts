import { IsString, IsOptional, IsArray, IsNumber, IsNumberString } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  permissions?: number[];
}

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  permissions?: number[];
}

export class RoleQueryDto {
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
