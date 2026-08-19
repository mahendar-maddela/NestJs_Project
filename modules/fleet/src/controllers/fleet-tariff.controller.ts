import { Controller, Get, Param, ParseIntPipe, Req, UseGuards } from '@nestjs/common';
import { FleetAuthGuard } from '@modules/auth';
import { FleetTariffService } from '../services/fleet-tariff.service';

/** Mirrors `routes/Fleet/tariffRoutes.js`. */
@Controller('v1/fleet/tariff')
@UseGuards(FleetAuthGuard)
export class FleetTariffController {
  constructor(private readonly tariffService: FleetTariffService) {}

  private clientId(req: any): number {
    return Number(req.user.clientId);
  }

  @Get(':fleetGroupId')
  async getFleetGroupWithVendorUsers(@Req() req: any, @Param('fleetGroupId', ParseIntPipe) fleetGroupId: number) {
    return this.tariffService.getFleetGroupWithVendorUsers(fleetGroupId, this.clientId(req));
  }

  @Get('fleet/:userTypeId')
  async getTariffByUserTypeId(@Req() req: any, @Param('userTypeId', ParseIntPipe) userTypeId: number) {
    return this.tariffService.getTariffByUserTypeId(userTypeId, this.clientId(req));
  }
}
