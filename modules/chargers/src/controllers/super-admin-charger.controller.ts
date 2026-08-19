import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { SuperAdminAuthGuard } from '@modules/auth';
import { SuperAdminChargerService } from '../services/super-admin-charger.service';
import { SuperAdminChargerQueryDto } from '../dto/super-admin-charger.dto';
import { AdminChargersService } from '../services/admin-chargers.service';

/** Mirrors `routes/SuperAdmin/chargerRoutes.js`. */
@Controller('v1/super-admin/chargers')
@UseGuards(SuperAdminAuthGuard)
export class SuperAdminChargerController {
  constructor(
    private readonly chargerService: SuperAdminChargerService,
    private readonly adminChargersService: AdminChargersService,
  ) {}

  @Get()
  async getClientsAllChargers(@Query() query: SuperAdminChargerQueryDto) {
    return this.chargerService.getClientsAllChargers(query);
  }

  @Get('logs/date-wise/:id')
  async getLogsDateWise(@Param('id', ParseIntPipe) id: number, @Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.chargerService.getLogsDateWise(id, startDate, endDate);
  }

  @Get('logs/:id')
  async getDeviceLogsOfCharger(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.chargerService.getDeviceLogsOfCharger(id, Number(page) || 1, Number(limit) || 100, startDate, endDate);
  }

  @Get('charging-session/:chargerId')
  async getClientSessionsByChargerId(@Param('chargerId', ParseIntPipe) chargerId: number, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.chargerService.getClientSessionsByChargerId(chargerId, Number(page) || 1, Number(limit) || 200);
  }

  @Get('details/:chargerId')
  async chargeDetails(@Param('chargerId') chargerId: string, @Query('detail') detail?: string) {
    return this.adminChargersService.chargeDetails(chargerId, detail);
  }

  @Get(':id')
  async getClientChargerById(@Param('id', ParseIntPipe) id: number) {
    return this.chargerService.getClientChargerById(id);
  }
}
