import { IsNotEmpty, IsString } from 'class-validator';

export class CreateBrandDto {
  @IsNotEmpty()
  @IsString()
  name: string;
}

export class UpdateBrandDto {
  @IsNotEmpty()
  @IsString()
  name: string;
}
