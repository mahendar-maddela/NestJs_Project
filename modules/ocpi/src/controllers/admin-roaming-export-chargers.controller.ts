import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AdminAuthGuard, ClientFeaturesGuard, ClientFeatureRequired, StaffPermissionsGuard, StaffPermission } from '@modules/auth';
import { AdminRoamingExportService } from '../services/admin-roaming-export.service';
import { AddExportRoamingChargersDto, RoamingChargerStatusUpdateDto, UpdateRoamingTariffDto } from '../dto/admin-roaming.dto';

/** Mirrors `routes/admin/roaming/export/chargers.routes.js`, which legacy mounts at the singular
 *  `.../export/charger` prefix. Both spellings are registered so existing legacy clients keep working. */
@Controller(['v1/admin/roaming/export/chargers', 'v1/admin/roaming/export/charger'])
@UseGuards(AdminAuthGuard, ClientFeaturesGuard, StaffPermissionsGuard)
@ClientFeatureRequired('Nexin Roaming Export')
@StaffPermission('Nexin_Roaming_Management')
export class AdminRoamingExportChargersController {
  constructor(private readonly exportService: AdminRoamingExportService) {}

  private clientId(req: any): number {
    return Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 0);
  }

  @Post()
  async addExportRoamingChargers(@Req() req: any, @Body() dto: AddExportRoamingChargersDto) {
    return this.exportService.addExportRoamingChargers(this.clientId(req), dto);
  }

  @Put('status')
  async roamingChargerStatusUpdate(@Req() req: any, @Body() dto: RoamingChargerStatusUpdateDto) {
    return this.exportService.roamingChargerStatusUpdate(this.clientId(req), dto);
  }

  @Put('tariff')
  async updateClientRoamingTariff(@Req() req: any, @Body() dto: UpdateRoamingTariffDto) {
    return this.exportService.updateClientRoamingTariff(this.clientId(req), dto);
  }

  @Get(':importClientId')
  async getAllExportedChargersByClientId(
    @Req() req: any,
    @Param('importClientId', ParseIntPipe) importClientId: number,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('isRoaming') isRoaming?: string,
  ) {
    return this.exportService.getAllExportedChargersByClientId(importClientId, this.clientId(req), { search, page, limit, isRoaming });
  }
}
