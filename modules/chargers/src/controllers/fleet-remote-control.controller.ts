import { Body, Controller, Post, Query, Req, UseGuards } from '@nestjs/common';
import { FleetAuthGuard } from '@modules/auth';
import { FleetRemoteControlService } from '../services/fleet-remote-control.service';
import { FleetRemoteStartDto, FleetRemoteStopDto } from '../dto/fleet-remote-control.dto';

/** Mirrors `routes/Fleet/ocppRoutes.js`. */
@Controller('v1/fleet/ocpp')
@UseGuards(FleetAuthGuard)
export class FleetRemoteControlController {
  constructor(private readonly remoteControlService: FleetRemoteControlService) {}

  @Post('start')
  async fleetUserHandleRemoteStart(@Req() req: any, @Query('platform') platform: string | undefined, @Body() dto: FleetRemoteStartDto) {
    return this.remoteControlService.fleetUserHandleRemoteStart(req.user.id, Number(req.user.fleetId), Number(req.user.clientId), platform, dto);
  }

  @Post('stop')
  async fleetHandleRemoteStop(@Req() req: any, @Query('platform') platform: string | undefined, @Body() dto: FleetRemoteStopDto) {
    return this.remoteControlService.fleetHandleRemoteStop(req.user.id, platform, dto);
  }
}
