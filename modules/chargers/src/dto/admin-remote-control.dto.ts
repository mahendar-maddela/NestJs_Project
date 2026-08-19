import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class AdminRemoteStartDto {
  @IsNotEmpty()
  @IsString()
  connectorId: string;

  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  amount: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  energy?: number;
}
export class AdminRemoteStopDto {
  transactionId: number;
}
