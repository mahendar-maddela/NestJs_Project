import { Body, Controller, Get, Param, ParseIntPipe, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { AdminAuthGuard, ClientFeaturesGuard, ClientFeatureRequired, StaffPermissionsGuard, StaffPermission } from '@modules/auth';
import { AdminRoamingExportService } from '../services/admin-roaming-export.service';
import { RoamingClientStatusUpdateDto } from '../dto/admin-roaming.dto';

/** Mirrors `routes/admin/roaming/export/clients.routes.js`. */
@Controller('v1/admin/roaming/export/clients')
@UseGuards(AdminAuthGuard, ClientFeaturesGuard, StaffPermissionsGuard)
@ClientFeatureRequired('Nexin Roaming Export')
@StaffPermission('Nexin_Roaming_Management')
export class AdminRoamingExportClientsController {
  constructor(private readonly exportService: AdminRoamingExportService) {}

  private clientId(req: any): number {
    return Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 0);
  }

  @Get()
  async getAllExportedRoamingClients(@Req() req: any, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.exportService.getAllExportedRoamingClients(this.clientId(req), Number(page) || 1, Number(limit) || 10);
  }

  @Patch(':roamingClientId/status')
  async roamingClientStatusUpdate(@Param('roamingClientId', ParseIntPipe) roamingClientId: number, @Body() dto: RoamingClientStatusUpdateDto) {
    return this.exportService.roamingClientStatusUpdate(roamingClientId, dto);
  }
}
