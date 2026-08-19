import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class BrowseStationsQueryDto {
  @IsOptional() @IsNumber() @Type(() => Number) latitude?: number;
  @IsOptional() @IsNumber() @Type(() => Number) longitude?: number;
  @IsOptional() @IsInt() @Type(() => Number) limit?: number;
  @IsOptional() @IsInt() @Type(() => Number) page?: number;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsNumber() @Type(() => Number) min_power_output?: number;
  @IsOptional() @IsString() stationType?: string;
  @IsOptional() @IsString() connectorTypes?: string;
}
