import { Body, Controller, Get, Param, ParseIntPipe, Put, Query, UseGuards } from '@nestjs/common';
import { SuperAdminAuthGuard } from '@modules/auth';
import { SuperAdminClientAmcService } from '../services/super-admin-client-amc.service';
import { SuperAdminClientAmcQueryDto, RenewClientAmcDto } from '../dto/super-admin-client-amc.dto';

/** Mirrors `routes/SuperAdmin/clientAMCRoutes.js` + `controllers/suparAdmin/clientAmcController.js`. */
@Controller('v1/super-admin/client-amc')
@UseGuards(SuperAdminAuthGuard)
export class SuperAdminClientAmcController {
  constructor(private readonly clientAmcService: SuperAdminClientAmcService) {}

  @Get('card-stacks')
  async cardStacks() {
    return this.clientAmcService.cardStacks();
  }

  @Get()
  async getAllClientsAmcs(@Query() query: SuperAdminClientAmcQueryDto) {
    return this.clientAmcService.getAllClientsAmcs(query);
  }

  @Put('renew')
  async renewClientAMC(@Body() dto: RenewClientAmcDto) {
    return this.clientAmcService.renewClientAMC(dto);
  }

  @Get('charger-status-count/:clientId')
  async chargerStatusCount(@Param('clientId', ParseIntPipe) clientId: number) {
    return this.clientAmcService.chargerStatusCount(clientId);
  }

  @Get(':clientId')
  async getClientAMCbyclientId(@Param('clientId', ParseIntPipe) clientId: number) {
    return this.clientAmcService.getClientAMCbyclientId(clientId);
  }
}
