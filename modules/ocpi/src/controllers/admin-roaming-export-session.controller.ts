import { Controller, Get, Param, ParseIntPipe, Query, Req, UseGuards } from '@nestjs/common';
import { AdminAuthGuard, ClientFeaturesGuard, ClientFeatureRequired, StaffPermissionsGuard, StaffPermission } from '@modules/auth';
import { AdminRoamingExportService } from '../services/admin-roaming-export.service';

/** Mirrors `routes/admin/roaming/export/session.routes.js`. */
@Controller('v1/admin/roaming/export/session')
@UseGuards(AdminAuthGuard, ClientFeaturesGuard, StaffPermissionsGuard)
@ClientFeatureRequired('Nexin Roaming Export')
@StaffPermission('Nexin_Roaming_Management')
export class AdminRoamingExportSessionController {
  constructor(private readonly exportService: AdminRoamingExportService) {}

  private clientId(req: any): number {
    return Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 0);
  }

  @Get('analytics/:importClientId')
  async getRoamingEachMonthAnalytics(
    @Req() req: any,
    @Param('importClientId', ParseIntPipe) importClientId: number,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('stationId') stationId?: string,
    @Query('chargerId') chargerId?: string,
    @Query('vendorId') vendorId?: string,
  ) {
    return this.exportService.getRoamingEachMonthAnalytics(importClientId, this.clientId(req), { month, year, stationId, chargerId, vendorId });
  }

  @Get('stats/:importClientId')
  async getStacksdata(
    @Req() req: any,
    @Param('importClientId', ParseIntPipe) importClientId: number,
    @Query('stationId') stationId?: string,
    @Query('chargerId') chargerId?: string,
    @Query('year') year?: string,
  ) {
    return this.exportService.getStacksData(importClientId, this.clientId(req), { stationId, chargerId, year });
  }

  @Get('download/:importClientId')
  async downloadRoamingExportedChargerSessions(@Req() req: any, @Param('importClientId', ParseIntPipe) importClientId: number) {
    return this.exportService.downloadRoamingExportedChargerSessions(importClientId, this.clientId(req));
  }

  @Get(':importClientId')
  async getAllRoamingExportedChargerSessions(
    @Req() req: any,
    @Param('importClientId', ParseIntPipe) importClientId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.exportService.getAllRoamingExportedChargerSessions(importClientId, this.clientId(req), Number(page) || 1, Number(limit) || 10);
  }
}
