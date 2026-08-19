import { Controller, Get, Post, Param, ParseIntPipe, Query, Req, UseGuards } from '@nestjs/common';
import { UserStationService } from '../services/user-station.service';
import { UserAuthGuard } from '@modules/auth';

function currentClientId(req: any): number {
  return Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 1);
}

/** Driver station/charger browsing. Mirrors legacy `src/routes/app/stationRoutes.js` (`v1/station/*`). */
@Controller('v1/station')
@UseGuards(UserAuthGuard)
export class UserStationsController {
  constructor(private readonly stationService: UserStationService) {}

  @Get('locations')
  async getStationLocations(@Req() req: any, @Query() query: any) {
    return this.stationService.getAllStationLocations(currentClientId(req), query);
  }

  @Get()
  async getAllStations(@Req() req: any, @Query() query: any) {
    return this.stationService.getAllInternalStations(currentClientId(req), query);
  }

  @Get('nearby')
  async getNearbyStations(@Req() req: any, @Query() query: any) {
    return this.stationService.getAllNearbyStations(currentClientId(req), query);
  }

  @Get('ocpi')
  async getOcpiStations(@Req() req: any, @Query() query: any) {
    return this.stationService.getAllOcpiStations(currentClientId(req), query);
  }

  @Get('favourites/all')
  async getAllFavourites(@Req() req: any) {
    return this.stationService.getAllFavourites(req.user.id, currentClientId(req));
  }

  @Post('favourites/:stationId')
  async toggleFavourite(@Req() req: any, @Param('stationId', ParseIntPipe) stationId: number) {
    return this.stationService.toggleFavourite(req.user.id, currentClientId(req), stationId);
  }

  @Get('charger/:chargerId')
  async getChargerByChargerId(@Req() req: any, @Param('chargerId', ParseIntPipe) chargerId: number, @Query('connectorId') connectorId?: string) {
    return this.stationService.getChargerByChargerId(currentClientId(req), req.user.id, chargerId, connectorId);
  }

  @Get(':stationId')
  async getChargerByStationId(@Req() req: any, @Param('stationId', ParseIntPipe) stationId: number) {
    return this.stationService.getChargerByStationId(currentClientId(req), req.user.id, stationId);
  }
}
