import { Controller, Get } from '@nestjs/common';
import { ReportsService } from '../services/reports.service';

@Controller('v1/admin/reports')
export class AdminReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('revenue')
  async getRevenue() {
    return this.reportsService.getRevenueReport();
  }
}
