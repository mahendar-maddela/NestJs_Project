import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateChargerDto {
  @IsString()
  @IsNotEmpty()
  chargerId: string; // EVSE hardware serial / identifier

  @IsNumber()
  @IsOptional()
  stationId?: number;

  @IsNumber()
  @IsOptional()
  capacity?: number;

  @IsString()
  @IsOptional()
  brand?: string;

  @IsEnum(['AC', 'DC'])
  @IsOptional()
  powerType?: 'AC' | 'DC';
}
