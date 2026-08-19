import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  // @MinLength(6)
  password: string;
}

export class UserLoginDto {
  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsOptional()
  fcmToken?: string;
}

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  contact: string;

  @IsString()
  @IsNotEmpty()
  otp: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class UserSignUpDto {
  @IsString()
  @IsNotEmpty()
  contact: string;

  @IsString()
  @IsOptional()
  name?: string;
}

export class UserRegisterVerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  otp: string;
}

export class UserLoginByContactDto {
  @IsString()
  @IsNotEmpty()
  contact: string;
}

export class UserLoginWithPasswordDto {
  @IsString()
  @IsNotEmpty()
  contact: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class UserResendOtpDto {
  @IsString()
  @IsNotEmpty()
  contact: string;
}

export class UserFcmTokenDto {
  @IsString()
  @IsNotEmpty()
  fcmToken: string;
}

export class UserTenantLoginDto {
  @IsString()
  @IsNotEmpty()
  contact: string;
}

export class UserTenantVerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  otp: string;

  @IsString()
  @IsOptional()
  appName?: string;
}
