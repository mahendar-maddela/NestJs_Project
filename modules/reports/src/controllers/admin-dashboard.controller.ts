import { Body, Controller, Get, Param, ParseIntPipe, Put, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AdminAuthGuard } from '@modules/auth';
import { AdminDashboardService } from '../services/admin-dashboard.service';
import { DashboardTotalsQueryDto, StopNotStoppedSessionDto } from '../dto/admin-dashboard.dto';

/** Mirrors `routes/admin/dashboardRoutes.js` + `controllers/admin/dashboard.js`. */
@Controller('v1/admin/dashboard')
@UseGuards(AdminAuthGuard)
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  private clientId(req: any): number {
    return Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 0);
  }

  @Get()
  async getTotals(@Req() req: any, @Query() query: DashboardTotalsQueryDto) {
    return this.dashboardService.getTotals(this.clientId(req), query);
  }

  @Get('faulted')
  async getFaulted(@Req() req: any) {
    return this.dashboardService.getFaulted(this.clientId(req));
  }

  @Get('faulted/sessions')
  async getNotStoppedSessions(@Req() req: any) {
    return this.dashboardService.getNotStoppedSessions(this.clientId(req));
  }

  @Get('faulted/sessions/:transactionId')
  async getSingleNotStoppedSession(@Req() req: any, @Param('transactionId', ParseIntPipe) transactionId: number) {
    return this.dashboardService.getSingleNotStoppedSession(this.clientId(req), transactionId);
  }

  @Put('faulted/sessions/:transactionId/stop')
  async stopNotStoppedSession(
    @Req() req: any,
    @Param('transactionId', ParseIntPipe) transactionId: number,
    @Body() dto: StopNotStoppedSessionDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.dashboardService.stopNotStoppedSession(this.clientId(req), transactionId, dto.meterStop);
    res.status(result.httpStatus);
    return { success: true, message: result.message, data: result.data };
  }
}
