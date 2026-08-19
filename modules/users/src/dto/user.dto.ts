import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateUserProfileDto {
  @IsString()
  @IsOptional()
  first_name?: string;

  @IsString()
  @IsOptional()
  last_name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  gst?: string;

  @IsString()
  @IsOptional()
  pan?: string;
}

export class AddRfidTagDto {
  @IsString()
  @IsNotEmpty()
  rfIdTag: string;

  @IsString()
  @IsOptional()
  comments?: string;
}
