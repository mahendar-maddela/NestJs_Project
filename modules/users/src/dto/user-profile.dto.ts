import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateUserProfileDto {
  @IsOptional() @IsString() first_name?: string;
  @IsOptional() @IsString() last_name?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() gst?: string;
  @IsOptional() @IsString() password?: string;
}

export class SendContactUpdateOtpDto {
  @IsNotEmpty() @IsString() contact: string;
}

export class VerifyContactUpdateOtpDto {
  @IsNotEmpty() @IsString() otp: string;
}
