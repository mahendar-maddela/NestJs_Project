import { Body, Controller, Get, Param, ParseIntPipe, Put, Query, UseGuards } from '@nestjs/common';
import { SuperAdminAuthGuard } from '@modules/auth';
import { SuperAdminChargerAmcService } from '../services/super-admin-charger-amc.service';
import { SuperAdminChargerAmcQueryDto, RenewClientChargerAmcDto } from '../dto/super-admin-charger-amc.dto';

/** Mirrors `routes/SuperAdmin/chargerAmcRoutes.js` + `controllers/suparAdmin/chargerClientAmcController.js`. */
@Controller('v1/super-admin/charger-amc')
@UseGuards(SuperAdminAuthGuard)
export class SuperAdminChargerAmcController {
  constructor(private readonly chargerAmcService: SuperAdminChargerAmcService) {}

  @Get()
  async getAllClientChargers(@Query() query: SuperAdminChargerAmcQueryDto) {
    return this.chargerAmcService.getAllClientChargers(query);
  }

  @Get('history/:chargerId')
  async getChargerAmcHistoryById(@Param('chargerId', ParseIntPipe) chargerId: number, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.chargerAmcService.getChargerAmcHistoryById(chargerId, Number(page) || 1, Number(limit) || 20);
  }

  @Put(':chargerId/renew')
  async renewClientChargerAmc(@Param('chargerId', ParseIntPipe) chargerId: number, @Body() dto: RenewClientChargerAmcDto) {
    return this.chargerAmcService.renewClientChargerAmc(chargerId, dto);
  }

  @Get(':clientId')
  async getAllClientChargersByClientId(@Param('clientId', ParseIntPipe) clientId: number, @Query() query: SuperAdminChargerAmcQueryDto) {
    return this.chargerAmcService.getAllClientChargersByClientId(clientId, query);
  }
}
