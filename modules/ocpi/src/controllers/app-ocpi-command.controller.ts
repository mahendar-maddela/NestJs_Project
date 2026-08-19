import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { UserAuthGuard } from '@modules/auth';
import { AppOcpiCommandService } from '../services/app-ocpi-command.service';
import { AppOcpiStartSessionDto, AppOcpiStopSessionDto } from '../dto/app-ocpi.dto';

function currentClientId(req: any): number {
  return Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 1);
}

/** Mirrors `routes/app/ocpi/commandRoutes.js`. */
@Controller('v1/ocpi/commands')
@UseGuards(UserAuthGuard)
export class AppOcpiCommandController {
  constructor(private readonly commandService: AppOcpiCommandService) {}

  @Post('start-session')
  async ocpiStartSession(@Req() req: any, @Body() dto: AppOcpiStartSessionDto) {
    return this.commandService.ocpiStartSession(currentClientId(req), req.user.id, dto);
  }

  @Post('stop-session')
  async ocpiStopSession(@Req() req: any, @Body() dto: AppOcpiStopSessionDto) {
    return this.commandService.ocpiStopSession(currentClientId(req), dto);
  }
}
