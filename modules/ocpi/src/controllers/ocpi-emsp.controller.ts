import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Req, UseGuards } from '@nestjs/common';
import { OcpiEmspReceiverService } from '../services/ocpi-emsp-receiver.service';
import { OcpiCpoAuthGuard } from '@modules/auth';
import { OcpiCredentialsDto } from '../dto/ocpi-credentials.dto';
import {
  OcpiCdrPostDto,
  OcpiConnectorPatchDto,
  OcpiEvsePatchDto,
  OcpiLocationPatchDto,
  OcpiLocationPutDto,
  OcpiSessionPatchDto,
  OcpiSessionPutDto,
  OcpiTariffPutDto,
} from '../dto/ocpi-cpo-partner.dto';

interface OcpiCpoRequest {
  cpo: { id: number; clientId: number };
}

/**
 * We-are-eMSP public receiver. External roaming CPOs authenticate with Token A
 * (applied to the whole `/v1/ocpi/emsp` mount, including /versions, matching legacy)
 * and push locations/tariffs/sessions/cdrs to us, plus command result callbacks.
 * Mirrors legacy `src/routes/ocpi/ocpieMSPRoutes/*`.
 */
@Controller('v1/ocpi/emsp')
@UseGuards(OcpiCpoAuthGuard)
export class OcpiEmspController {
  constructor(private readonly receiverService: OcpiEmspReceiverService) {}

  @Get('versions')
  getVersions() {
    return this.receiverService.getCpoVersions();
  }

  @Get('versions/2.2.1')
  getVersions221() {
    return this.receiverService.getCpoVersionDetails();
  }

  @Post('2.2.1/credentials')
  async handshake(@Req() req: OcpiCpoRequest, @Body() body: OcpiCredentialsDto) {
    return this.receiverService.handleHandshake(req.cpo, body);
  }

  @Get('2.2.1/tariffs/:country_code/:party_id/:tariff_id')
  async getTariff(
    @Req() req: OcpiCpoRequest,
    @Param('country_code') country_code: string,
    @Param('party_id') party_id: string,
    @Param('tariff_id') tariff_id: string,
  ) {
    return this.receiverService.getTariff(req.cpo, country_code, party_id, tariff_id);
  }

  @Put('2.2.1/tariffs/:country_code/:party_id/:tariff_id')
  async putTariff(
    @Req() req: OcpiCpoRequest,
    @Param('country_code') country_code: string,
    @Param('party_id') party_id: string,
    @Param('tariff_id') tariff_id: string,
    @Body() body: OcpiTariffPutDto,
  ) {
    return this.receiverService.putTariff(req.cpo, country_code, party_id, tariff_id, body);
  }

  @Delete('2.2.1/tariffs/:country_code/:party_id/:tariff_id')
  async deleteTariff(
    @Req() req: OcpiCpoRequest,
    @Param('country_code') country_code: string,
    @Param('party_id') party_id: string,
    @Param('tariff_id') tariff_id: string,
  ) {
    return this.receiverService.deleteTariff(req.cpo, country_code, party_id, tariff_id);
  }

  @Get('2.2.1/locations/:country_code/:party_id/:location_id')
  async getLocation(
    @Req() req: OcpiCpoRequest,
    @Param('country_code') country_code: string,
    @Param('party_id') party_id: string,
    @Param('location_id') location_id: string,
  ) {
    return this.receiverService.getLocation(req.cpo, country_code, party_id, location_id);
  }

  @Put('2.2.1/locations/:country_code/:party_id/:location_id')
  async putLocation(
    @Req() req: OcpiCpoRequest,
    @Param('country_code') country_code: string,
    @Param('party_id') party_id: string,
    @Param('location_id') location_id: string,
    @Body() body: OcpiLocationPutDto,
  ) {
    return this.receiverService.putLocation(req.cpo, country_code, party_id, location_id, body);
  }

  @Patch('2.2.1/locations/:country_code/:party_id/:location_id')
  async patchLocation(
    @Req() req: OcpiCpoRequest,
    @Param('country_code') country_code: string,
    @Param('party_id') party_id: string,
    @Param('location_id') location_id: string,
    @Body() body: OcpiLocationPatchDto,
  ) {
    return this.receiverService.patchLocation(req.cpo, country_code, party_id, location_id, body);
  }

  @Patch('2.2.1/locations/:country_code/:party_id/:location_id/:evse_uid')
  async patchEvse(
    @Req() req: OcpiCpoRequest,
    @Param('country_code') country_code: string,
    @Param('party_id') party_id: string,
    @Param('location_id') location_id: string,
    @Param('evse_uid') evse_uid: string,
    @Body() body: OcpiEvsePatchDto,
  ) {
    return this.receiverService.patchEvse(req.cpo, country_code, party_id, location_id, evse_uid, body);
  }

  @Patch('2.2.1/locations/:country_code/:party_id/:location_id/:evse_uid/:connector_id')
  async patchConnector(
    @Req() req: OcpiCpoRequest,
    @Param('country_code') country_code: string,
    @Param('party_id') party_id: string,
    @Param('location_id') location_id: string,
    @Param('evse_uid') evse_uid: string,
    @Param('connector_id') connector_id: string,
    @Body() body: OcpiConnectorPatchDto,
  ) {
    return this.receiverService.patchConnector(req.cpo, country_code, party_id, location_id, evse_uid, connector_id, body);
  }

  @Post('2.2.1/commands/START_SESSION/:session_id')
  async startCommandResult(@Req() req: OcpiCpoRequest, @Param('session_id') session_id: string, @Body() body: any) {
    return this.receiverService.handleStartCommandResult(req.cpo, session_id, body.result, body.message);
  }

  @Post('2.2.1/commands/STOP_SESSION/:session_id')
  async stopCommandResult(@Req() req: OcpiCpoRequest, @Param('session_id') session_id: string, @Body() body: any) {
    return this.receiverService.handleStopCommandResult(req.cpo, session_id, body.result, body.message);
  }

  @Get('2.2.1/sessions/:country_code/:party_id/:session_id')
  async getSession(
    @Req() req: OcpiCpoRequest,
    @Param('country_code') country_code: string,
    @Param('party_id') party_id: string,
    @Param('session_id') session_id: string,
  ) {
    return this.receiverService.getSession(req.cpo, country_code, party_id, session_id);
  }

  @Put('2.2.1/sessions/:country_code/:party_id/:session_id')
  async putSession(
    @Req() req: OcpiCpoRequest,
    @Param('country_code') country_code: string,
    @Param('party_id') party_id: string,
    @Param('session_id') session_id: string,
    @Body() body: OcpiSessionPutDto,
  ) {
    return this.receiverService.putSession(req.cpo, country_code, party_id, session_id, body);
  }

  @Patch('2.2.1/sessions/:country_code/:party_id/:session_id')
  async patchSession(
    @Req() req: OcpiCpoRequest,
    @Param('country_code') country_code: string,
    @Param('party_id') party_id: string,
    @Param('session_id') session_id: string,
    @Body() body: OcpiSessionPatchDto,
  ) {
    return this.receiverService.patchSession(req.cpo, country_code, party_id, session_id, body);
  }

  @Get('2.2.1/cdrs/:cdr_id')
  async getCdrById(@Param('cdr_id') cdr_id: string) {
    return this.receiverService.getCdrById(cdr_id);
  }

  @Post('2.2.1/cdrs')
  async createCdr(@Req() req: OcpiCpoRequest, @Body() body: OcpiCdrPostDto) {
    return this.receiverService.createCdr(req.cpo, body);
  }
}
