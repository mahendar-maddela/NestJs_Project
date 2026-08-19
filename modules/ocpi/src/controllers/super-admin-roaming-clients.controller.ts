import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { SuperAdminAuthGuard } from '@modules/auth';
import { SuperAdminRoamingService } from '../services/super-admin-roaming.service';
import { ConnectClientToInternalRoamingDto } from '../dto/super-admin-roaming.dto';

/** Mirrors `routes/SuperAdmin/InternalRoaming/importingClients.routes.js`. */
@Controller('v1/super-admin/roaming/client')
@UseGuards(SuperAdminAuthGuard)
export class SuperAdminRoamingClientsController {
  constructor(private readonly roamingService: SuperAdminRoamingService) {}

  @Get(':exceptclientId')
  async getAllImportingClients(@Param('exceptclientId', ParseIntPipe) exceptclientId: number) {
    return this.roamingService.getAllImportingClients(exceptclientId);
  }

  @Get(':importClientId/chargers/:exportClientId')
  async getAllChargerByClientId(
    @Param('importClientId', ParseIntPipe) importClientId: number,
    @Param('exportClientId', ParseIntPipe) exportClientId: number,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('isRoaming') isRoaming?: string,
  ) {
    return this.roamingService.getAllChargerByClientId(importClientId, exportClientId, { search, page, limit, isRoaming });
  }

  @Get(':importClientId/connected/:exportClientId')
  async connectedClient(@Param('importClientId', ParseIntPipe) importClientId: number, @Param('exportClientId', ParseIntPipe) exportClientId: number) {
    return this.roamingService.connectedClient(importClientId, exportClientId);
  }

  @Post()
  async connectClientToInternalRoaming(@Body() dto: ConnectClientToInternalRoamingDto) {
    return this.roamingService.connectClientToInternalRoaming(dto);
  }
}
