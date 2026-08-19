import { Controller, Get, Param, ParseIntPipe, Query, Req, UseGuards } from '@nestjs/common';
import { AdminAuthGuard, ClientFeaturesGuard, ClientFeatureRequired, StaffPermissionsGuard, StaffPermission } from '@modules/auth';
import { AdminRoamingImportService } from '../services/admin-roaming-import.service';

/** Mirrors `routes/admin/roaming/import/clients.routes.js`. */
@Controller('v1/admin/roaming/import/clients')
@UseGuards(AdminAuthGuard, ClientFeaturesGuard, StaffPermissionsGuard)
@ClientFeatureRequired('Nexin Roaming Import')
@StaffPermission('Nexin_Roaming_Management')
export class AdminRoamingImportClientsController {
  constructor(private readonly importService: AdminRoamingImportService) {}

  private clientId(req: any): number {
    return Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 0);
  }

  @Get()
  async getAllImportedRoamingClients(@Req() req: any, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.importService.getAllImportedRoamingClients(this.clientId(req), Number(page) || 1, Number(limit) || 10);
  }

  @Get('chargers/:exportClientId')
  async getAllImportedRoamingChargers(
    @Req() req: any,
    @Param('exportClientId', ParseIntPipe) exportClientId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.importService.getAllImportedRoamingChargers(exportClientId, this.clientId(req), Number(page) || 1, Number(limit) || 10);
  }
}
