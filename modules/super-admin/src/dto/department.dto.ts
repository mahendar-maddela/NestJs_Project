import { IsString, IsOptional, IsNumberString } from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  name: string;
}

export class UpdateDepartmentDto {
  @IsString()
  name: string;
}

export class DepartmentQueryDto {
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
