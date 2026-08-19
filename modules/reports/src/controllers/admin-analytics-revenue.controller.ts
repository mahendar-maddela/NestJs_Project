import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AdminAuthGuard, ClientFeaturesGuard, ClientFeatureRequired, StaffPermissionsGuard, StaffPermission } from '@modules/auth';
import { AdminAnalyticsRevenueService } from '../services/admin-analytics-revenue.service';
import {
  RevenueFilterQueryDto,
  MonthlyRevenueQueryDto,
  YearlyRevenueQueryDto,
  EachMonthAnalyticsQueryDto,
  DownloadReportsQueryDto,
} from '../dto/admin-analytics-revenue.dto';

/** Mirrors `routes/admin/AnalyticsRevenueRoutes.js` + `controllers/admin/AnalyticsRevenueController.js`. */
@Controller('v1/admin/analytics/revenue')
@UseGuards(AdminAuthGuard, ClientFeaturesGuard, StaffPermissionsGuard)
@ClientFeatureRequired('Analytics Dashboard')
export class AdminAnalyticsRevenueController {
  constructor(private readonly analyticsRevenueService: AdminAnalyticsRevenueService) {}

  private clientId(req: any): number {
    return Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 0);
  }

  @Get('download')
  @StaffPermission('Session_Download')
  async downloadReportsByFilters(@Req() req: any, @Query() query: DownloadReportsQueryDto) {
    return this.analyticsRevenueService.downloadReportsByFilters(this.clientId(req), query);
  }

  @Get('today')
  @StaffPermission('Revenue_Analytics_View')
  async getTodayRevenue(@Req() req: any, @Query() query: RevenueFilterQueryDto) {
    return this.analyticsRevenueService.getTodayRevenue(this.clientId(req), query);
  }

  @Get('month')
  @StaffPermission('Revenue_Analytics_View')
  async getMonthlyRevenue(@Req() req: any, @Query() query: MonthlyRevenueQueryDto) {
    return this.analyticsRevenueService.getMonthlyRevenue(this.clientId(req), query);
  }

  @Get('year')
  @StaffPermission('Revenue_Analytics_View')
  async getYearlyRevenue(@Req() req: any, @Query() query: YearlyRevenueQueryDto) {
    return this.analyticsRevenueService.getYearlyRevenue(this.clientId(req), query);
  }

  @Get('total-revenue')
  @StaffPermission('Revenue_Analytics_View')
  async getTotalRevenue(@Req() req: any, @Query() query: RevenueFilterQueryDto) {
    return this.analyticsRevenueService.getTotalRevenue(this.clientId(req), query);
  }

  @Get('month-analytics')
  @StaffPermission('Revenue_Analytics_View')
  async getEachMonthAnalytics(@Req() req: any, @Query() query: EachMonthAnalyticsQueryDto) {
    return this.analyticsRevenueService.getEachMonthAnalytics(this.clientId(req), query);
  }

  @Get('station-charger')
  @StaffPermission('Revenue_Analytics_View')
  async getAllStationWithStation(@Req() req: any) {
    return this.analyticsRevenueService.getAllStationWithStation(this.clientId(req));
  }
}
