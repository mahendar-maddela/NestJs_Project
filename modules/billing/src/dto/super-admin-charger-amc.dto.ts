import { PaginationQueryDto } from '@modules/sessions/src/dto/admin-device-transaction.dto';
import { IsNumberString, IsOptional, IsString } from 'class-validator';

export class SuperAdminChargerAmcQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumberString()
  vendorId?: string;

}

/** Legacy imports `renewClientChargerAMCValidation` but never wires it to this route — unvalidated. */
export class RenewClientChargerAmcDto {
  startDate: string;
  endDate: string;
  paid_amount?: string | number;
  amount_per_annum?: string | number;
  status?: string;
}
