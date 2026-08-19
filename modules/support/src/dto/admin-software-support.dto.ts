import { IsOptional, IsString } from 'class-validator';

export class SoftwareSupportQueryDto {
  @IsOptional() @IsString() page?: string;
  @IsOptional() @IsString() limit?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() priority?: string;
  @IsOptional() @IsString() createdDate?: string;
}

export class CreateSoftwareSupportDto {
  title: string;
  type?: string;
  description?: string;
}

export class SendSoftwareSupportMessageDto {
  message: string;
}
