import { Controller, Get, Param, ParseIntPipe, Query, Req, UseGuards } from '@nestjs/common';
import { UserAuthGuard } from '@modules/auth';
import { UserChargerService } from '../services/user-charger.service';

function currentClientId(req: any): number {
  return Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 1);
}

/** Mirrors `routes/Web/chargerRoutes.js`, mounted at `v1/web/charger` and reused at `v1/charger` by the app router. */
@Controller(['v1/web/charger', 'v1/charger'])
@UseGuards(UserAuthGuard)
export class UserChargersController {
  constructor(private readonly userChargerService: UserChargerService) {}

  @Get('search')
  async getAllStationWithSearch(@Req() req: any, @Query('search') search?: string) {
    return this.userChargerService.getAllStationWithSearch(currentClientId(req), search);
  }

  @Get('details/:chargerId')
  async getWithChargerIdDetails(@Req() req: any, @Param('chargerId') chargerId: string) {
    return this.userChargerService.getWithChargerIdDetails(chargerId, currentClientId(req));
  }

  @Get(':chargerId')
  async getChargerDetails(@Req() req: any, @Param('chargerId', ParseIntPipe) chargerId: number) {
    return this.userChargerService.getChargerDetails(chargerId, currentClientId(req), req.user?.id);
  }
}
