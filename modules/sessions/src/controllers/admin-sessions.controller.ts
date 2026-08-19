import { Controller, Get, Param, ParseIntPipe, Query, Req, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '@modules/auth';
import { SessionService } from '../services/session.service';

/** Mirrors `routes/admin/chargingSessionRoutes.js` + `controllers/admin/chargingSessionController.js`. */
@Controller('v1/admin/charging-session')
@UseGuards(AdminAuthGuard)
export class AdminSessionsController {
  constructor(private readonly sessionService: SessionService) {}

  private clientId(req: any): number {
    return Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 0);
  }

  @Get()
  async getAllSessions(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.sessionService.getAllSessions(Number(page) || 1, Number(limit) || 200);
  }

  @Get('charger/:chargerId')
  async getSessionByChargerId(
    @Req() req: any,
    @Param('chargerId', ParseIntPipe) chargerId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.sessionService.getSessionByChargerId(chargerId, this.clientId(req), Number(page) || 1, Number(limit) || 200);
  }
}
