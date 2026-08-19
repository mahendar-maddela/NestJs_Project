import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SuperAdminAuthGuard } from '@modules/auth';
import { SuperAdminAnalyticsRevenueService } from '../services/super-admin-analytics-revenue.service';
import {
  SuperAdminRevenueFilterQueryDto,
  SuperAdminMonthlyRevenueQueryDto,
  SuperAdminYearlyRevenueQueryDto,
  SuperAdminEachMonthAnalyticsQueryDto,
  SuperAdminDownloadReportsQueryDto,
} from '../dto/super-admin-analytics-revenue.dto';

/** Mirrors `routes/SuperAdmin/analyticsRevenueRoutes.js`. */
@Controller('v1/super-admin/analytics/revenue')
@UseGuards(SuperAdminAuthGuard)
export class SuperAdminAnalyticsRevenueController {
  constructor(private readonly analyticsService: SuperAdminAnalyticsRevenueService) {}

  @Get('download')
  async downloadSessionReportsByFilters(@Query() query: SuperAdminDownloadReportsQueryDto) {
    return this.analyticsService.downloadSessionReportsByFilters(query);
  }

  @Get('today')
  async getTodayRevenueReport(@Query() query: SuperAdminRevenueFilterQueryDto) {
    return this.analyticsService.getTodayRevenueReport(query);
  }

  @Get('month')
  async getMonthlyRevenueReport(@Query() query: SuperAdminMonthlyRevenueQueryDto) {
    return this.analyticsService.getMonthlyRevenueReport(query);
  }

  @Get('year')
  async getYearlyRevenueReport(@Query() query: SuperAdminYearlyRevenueQueryDto) {
    return this.analyticsService.getYearlyRevenueReport(query);
  }

  @Get('year-analytics')
  async getEachMonthAnalyticsReport(@Query() query: SuperAdminEachMonthAnalyticsQueryDto) {
    return this.analyticsService.getEachMonthAnalyticsReport(query);
  }
}
