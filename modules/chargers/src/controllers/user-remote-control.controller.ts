import { Body, Controller, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { UserAuthGuard } from '@modules/auth';
import { UserRemoteControlService } from '../services/user-remote-control.service';
import { UserRemoteStartDto, UserRemoteStopDto } from '../dto/user-remote-control.dto';

function currentClientId(req: any): number {
  return Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 1);
}

/** Mirrors `routes/Web/ocppRoutes.js`, mounted at `v1/web/ocpp` and reused at `v1/ocpp` by the app router. */
@Controller(['v1/web/ocpp', 'v1/ocpp'])
@UseGuards(UserAuthGuard)
export class UserRemoteControlController {
  constructor(private readonly remoteControlService: UserRemoteControlService) {}

  @Post('start/:chargerId')
  async handleRemoteStart(@Req() req: any, @Param('chargerId') chargerId: string, @Query('platform') platform: string | undefined, @Body() dto: UserRemoteStartDto) {
    return this.remoteControlService.handleRemoteStart(req.user.id, chargerId, currentClientId(req), platform, dto);
  }

  @Post('stop/:chargerId')
  async handleRemoteStop(@Req() req: any, @Param('chargerId') chargerId: string, @Query('platform') platform: string | undefined, @Body() dto: UserRemoteStopDto) {
    return this.remoteControlService.handleRemoteStop(chargerId, currentClientId(req), platform, dto);
  }
}
