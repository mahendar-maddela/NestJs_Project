import { Controller, Get, Param, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { SuperAdminStationsService } from '../services/super-admin-stations.service';
import { SuperAdminStationQueryDto } from '../dto/station-query.dto';
import { SuperAdminAuthGuard } from '@modules/auth';

@Controller('v1/super-admin/stations')
@UseGuards(SuperAdminAuthGuard)
export class SuperAdminStationsController {
  constructor(private readonly superAdminStationsService: SuperAdminStationsService) {}

  @Get()
  async getAllClientsStations(@Query() query: SuperAdminStationQueryDto) {
    return this.superAdminStationsService.getAllClientsStations(query);
  }

  @Get(':stationId')
  async getClientStationById(@Param('stationId', ParseIntPipe) stationId: number) {
    return this.superAdminStationsService.getClientStationById(stationId);
  }
}
