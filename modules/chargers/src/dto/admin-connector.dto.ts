import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateConnectorDto {
  @IsInt()
  chargerId: number;

  @IsOptional()
  @IsString()
  portType?: string;

  @IsOptional()
  @IsString()
  max_power?: string;

  @IsString()
  connectorId: string;

  @IsOptional()
  @IsInt()
  tariffId?: number;

  @IsOptional()
  @IsString()
  info?: string;
}

export class UpdateConnectorDto {
  @IsOptional()
  @IsInt()
  chargerId?: number;

  @IsOptional()
  @IsString()
  portType?: string;

  @IsOptional()
  @IsString()
  max_power?: string;

  @IsOptional()
  @IsString()
  connectorId?: string;

  @IsOptional()
  @IsInt()
  tariffId?: number;

  @IsOptional()
  @IsString()
  info?: string;
}
