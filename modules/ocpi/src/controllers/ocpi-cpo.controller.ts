import { Controller, Get, Post, Body, Query, Req, UseGuards } from '@nestjs/common';
import { OcpiService } from '../services/ocpi.service';
import { OcpiEmspAuthGuard } from '@modules/auth';
import { OcpiCredentialsDto } from '../dto/ocpi-credentials.dto';
import { OcpiStartCommandDto, OcpiStopCommandDto } from '../dto/ocpi-command.dto';

interface OcpiEmspRequest {
  emsp: { id: number; clientId: number };
}

/**
 * We-are-CPO export API. External eMSPs authenticate with Token A (legacy applies
 * `ocpieMSPAuthorization` to the whole `/v1/ocpi/cpo` mount, including /versions) and
 * pull our locations/tariffs/sessions/cdrs, push credentials, and send commands.
 * Mirrors legacy `src/routes/ocpi/ocpiCpoRoutes/*`.
 */
@Controller('v1/ocpi/cpo')
@UseGuards(OcpiEmspAuthGuard)
export class OcpiCpoController {
  constructor(private readonly ocpiService: OcpiService) {}

  @Get('versions')
  getVersions() {
    return this.ocpiService.getVersionsResponse();
  }

  @Get('versions/2.2.1')
  getVersions221() {
    return this.ocpiService.getVersionsDetailsResponse();
  }

  @Post('2.2.1/credentials')
  async handleCredentialsPost(@Req() req: OcpiEmspRequest, @Body() body: OcpiCredentialsDto) {
    return this.ocpiService.handleCredentialsPost(req.emsp.id, body);
  }

  @Post('2.2.1/commands/START_SESSION')
  async handleStartCommand(@Req() req: OcpiEmspRequest, @Body() body: OcpiStartCommandDto) {
    return this.ocpiService.handleStartCommand(req.emsp, body);
  }

  @Post('2.2.1/commands/STOP_SESSION')
  async handleStopCommand(@Body() body: OcpiStopCommandDto) {
    return this.ocpiService.handleStopCommand(body);
  }

  @Get('2.2.1/tariffs')
  async pullTariffsForEmsps(@Req() req: OcpiEmspRequest, @Query() query: any) {
    return this.ocpiService.pullTariffsForEmsps(req.emsp.id, query);
  }

  @Get('2.2.1/locations')
  async pullLocationsForEmsps(@Req() req: OcpiEmspRequest, @Query() query: any) {
    return this.ocpiService.pullLocationsForEmsps(req.emsp.id, query);
  }

  @Get('2.2.1/cdrs')
  async getCdrs(@Req() req: OcpiEmspRequest, @Query() query: any) {
    return this.ocpiService.getCdrs(req.emsp.id, query);
  }

  @Get('2.2.1/sessions')
  async getSessions(@Req() req: OcpiEmspRequest, @Query() query: any) {
    return this.ocpiService.getSessionsForEmsp(req.emsp.id, query);
  }
}
