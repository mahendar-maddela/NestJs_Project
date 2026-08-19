import { Controller, Get, Param, ParseIntPipe, Query, Req, UseGuards } from '@nestjs/common';
import { AdminAuthGuard, ClientFeaturesGuard, ClientFeatureRequired, StaffPermissionsGuard, StaffPermission } from '@modules/auth';
import { AdminRoamingImportService } from '../services/admin-roaming-import.service';

/** Mirrors `routes/admin/roaming/import/session.routes.js`. */
@Controller('v1/admin/roaming/import/session')
@UseGuards(AdminAuthGuard, ClientFeaturesGuard, StaffPermissionsGuard)
@ClientFeatureRequired('Nexin Roaming Import')
@StaffPermission('Nexin_Roaming_Management')
export class AdminRoamingImportSessionController {
  constructor(private readonly importService: AdminRoamingImportService) {}

  private clientId(req: any): number {
    return Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 0);
  }

  @Get('analytics/:exportClientId')
  async getRoamEachMonthAnalytics(
    @Req() req: any,
    @Param('exportClientId', ParseIntPipe) exportClientId: number,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('stationId') stationId?: string,
    @Query('chargerId') chargerId?: string,
    @Query('vendorId') vendorId?: string,
  ) {
    return this.importService.getRoamEachMonthAnalytics(exportClientId, this.clientId(req), { month, year, stationId, chargerId, vendorId });
  }

  @Get('stats/:exportClientId')
  async getStacksData(
    @Req() req: any,
    @Param('exportClientId', ParseIntPipe) exportClientId: number,
    @Query('stationId') stationId?: string,
    @Query('chargerId') chargerId?: string,
    @Query('year') year?: string,
  ) {
    return this.importService.getStacksData(exportClientId, this.clientId(req), { stationId, chargerId, year });
  }

  @Get(':exportClientId')
  async getAllRoamingChargerSessions(
    @Req() req: any,
    @Param('exportClientId', ParseIntPipe) exportClientId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.importService.getAllRoamingChargerSessions(exportClientId, this.clientId(req), Number(page) || 1, Number(limit) || 10);
  }
}
