import { IsOptional, IsString } from 'class-validator';

export class CreateFeatureDto {
  @IsString()
  name: string;
}

export class UpdateFeatureDto {
  @IsOptional()
  @IsString()
  name?: string;
}
