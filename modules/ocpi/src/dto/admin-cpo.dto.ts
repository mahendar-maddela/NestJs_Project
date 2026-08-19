import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateOcpiCpoDto {
  @IsNotEmpty() @IsString() party_id: string;

  @IsNotEmpty() @IsString() country_code: string;

  @IsNotEmpty() @IsString() business_name: string;

  @IsNotEmpty() @IsString() url: string;

  @IsOptional() @IsString() token_b?: string;
}

export class UpdateOcpiCpoDto {
  @IsOptional() @IsString() business_name?: string;

  @IsOptional() @IsString() url?: string;

  @IsOptional() @IsString() token_b?: string;

  @IsOptional() @IsString() status?: string;

  @IsOptional() @IsString() party_id?: string;
}

export class SendCpoVersionsEndpointsDto {
  @IsNotEmpty() @IsString() version: string;
}

export class RemoteStartSessionDto {
  @IsNotEmpty() @IsString() userId: string;

  @IsNotEmpty() @IsString() evseId: string;

  @IsNotEmpty() @IsString() connector_id: string;

  @IsNotEmpty() @IsNumber() @Type(() => Number) amount: number;
}

export class RemoteStopSessionDto {
  @IsNotEmpty() @IsString() session_id: string;

  @IsNotEmpty() @IsString() evseId: string;
}

export class CancelSessionDto {
  @IsNotEmpty() @IsString() session_id: string;

  @IsNotEmpty() @IsString() evseId: string;
}
