import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { FleetAuthGuard } from '@modules/auth';
import { FleetChargerService } from '../../../fleet/src/services/fleet-charger.service';

/** Mirrors `routes/Fleet/chargerRoutes.js`. */
@Controller('v1/fleet/charger')
@UseGuards(FleetAuthGuard)
export class FleetChargersController {
  constructor(private readonly fleetChargerService: FleetChargerService) {}

  @Get('associated')
  async getAssociatedChargers(@Req() req: any) {
    return this.fleetChargerService.getAssociatedChargers(Number(req.user.fleetId), Number(req.user.clientId));
  }
}
