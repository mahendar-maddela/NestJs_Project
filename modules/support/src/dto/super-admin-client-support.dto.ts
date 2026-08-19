import { IsIn, IsNotEmpty, IsOptional } from 'class-validator';

export class ClientSupportQueryDto {
  page?: string;
  limit?: string;
  status?: string;
  search?: string;
  clientId?: string;
  priority?: string;
  date?: string;
}

export class CreateClientSupportDto {
  clientId: number;
  title?: string;
  priority?: string;
  description?: string;
  type?: string;
}

export class UpdateClientSupportDto {
  status?: string;
  title?: string;
  priority?: string;
  description?: string;
  type?: string;
}

export class AssignSupportDto {
  employeeIds?: number[];
}

class EmployeeWorkedHoursDto {
  employeeId: number;
  workedHours?: number;
}

export class StatusUpdateSupportDto {
  @IsNotEmpty()
  @IsIn(['Pending', 'Open', 'Closed'])
  status: string;

  @IsOptional()
  totalWorkedHours?: number;

  @IsOptional()
  employeeWorkedHours?: EmployeeWorkedHoursDto[];
}

export class SendSupportMessageDto {
  message: string;
}
