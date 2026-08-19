import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { FleetAuthGuard } from '@modules/auth';
import { FleetDashboardService } from '../services/fleet-dashboard.service';

/** Mirrors `routes/Fleet/dashboardRoutes.js`. */
@Controller('v1/fleet/dashboard')
@UseGuards(FleetAuthGuard)
export class FleetDashboardController {
  constructor(private readonly dashboardService: FleetDashboardService) {}

  private fleetId(req: any): number {
    return Number(req.user.fleetId);
  }

  private clientId(req: any): number {
    return Number(req.user.clientId);
  }

  @Get('stats')
  async getCardCounts(@Req() req: any) {
    return this.dashboardService.getCardCounts(this.fleetId(req), this.clientId(req));
  }

  @Get('wallet-transactions')
  async getRecentWalletTransactions(@Req() req: any, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.dashboardService.getRecentWalletTransactions(this.fleetId(req), Number(page) || 1, Number(limit) || 5);
  }

  @Get('vehicles')
  async getDashboardVehicles(@Req() req: any) {
    return this.dashboardService.getDashboardVehicles(this.fleetId(req), this.clientId(req));
  }
}
