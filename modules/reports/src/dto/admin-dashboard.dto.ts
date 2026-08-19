import { IsIn, IsOptional } from 'class-validator';

export class DashboardTotalsQueryDto {
  @IsOptional()
  @IsIn(['week', 'twoWeeks', 'month', 'quarter'])
  period?: 'week' | 'twoWeeks' | 'month' | 'quarter';
}

export class StopNotStoppedSessionDto {
  meterStop: number;
}
