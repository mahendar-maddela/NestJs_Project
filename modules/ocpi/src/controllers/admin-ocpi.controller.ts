import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AdminEmspService } from '../services/admin-emsp.service';
import { AdminAuthGuard, StaffPermissionsGuard, StaffPermission } from '@modules/auth';
import {
  CreateEmspDto,
  DownloadSessionsDto,
  PushLocationToEmspDto,
  PushTariffToEmspDto,
  SendCdrDto,
  SendVersionsEndpointsDto,
  UpdateEmspDto,
} from '../dto/admin-emsp.dto';

/**
 * Admin management of eMSP partners connected to our CPO.
 * Mirrors legacy `v1/admin/ocpi/emsp/*` (`src/routes/admin/ocpi/ocpieMSPRoutes.js`).
 */
@Controller('v1/admin/ocpi/emsp')
@UseGuards(AdminAuthGuard, StaffPermissionsGuard)
@StaffPermission('OCPI_EMSP_Management')
export class AdminOcpiController {
  constructor(private readonly adminEmspService: AdminEmspService) {}

  private clientId(req: any): number {
    return Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 1);
  }

  @Post()
  async create(@Req() req: any, @Body() dto: CreateEmspDto) {
    return this.adminEmspService.createEmsp(this.clientId(req), dto);
  }

  @Get()
  async findAll(@Req() req: any, @Query() query: any) {
    return this.adminEmspService.getAllEmsps(this.clientId(req), query);
  }

  @Get(':eMSPId')
  async findOne(@Req() req: any, @Param('eMSPId', ParseIntPipe) eMSPId: number) {
    return this.adminEmspService.getEmspById(this.clientId(req), eMSPId);
  }

  @Put(':eMSPId')
  async update(@Req() req: any, @Param('eMSPId', ParseIntPipe) eMSPId: number, @Body() dto: UpdateEmspDto) {
    return this.adminEmspService.updateEmsp(this.clientId(req), eMSPId, dto);
  }

  @Get('handshake/:eMSPId')
  async handshake(@Req() req: any, @Param('eMSPId', ParseIntPipe) eMSPId: number) {
    return this.adminEmspService.handshake(this.clientId(req), eMSPId);
  }

  @Get('versions/:eMSPId')
  async sendVersionsRequest(@Req() req: any, @Param('eMSPId', ParseIntPipe) eMSPId: number) {
    return this.adminEmspService.sendVersionsRequest(this.clientId(req), eMSPId);
  }

  @Post('versions/endpoint/:eMSPId')
  async sendVersionsEndpointsRequest(
    @Req() req: any,
    @Param('eMSPId', ParseIntPipe) eMSPId: number,
    @Body() dto: SendVersionsEndpointsDto,
  ) {
    return this.adminEmspService.sendVersionsEndpointsRequest(this.clientId(req), eMSPId, dto.version);
  }

  @Post('locations/:eMSPId/push')
  async pushLocationToEmsp(@Req() req: any, @Param('eMSPId', ParseIntPipe) eMSPId: number, @Body() dto: PushLocationToEmspDto) {
    return this.adminEmspService.pushLocationToEmsp(this.clientId(req), eMSPId, dto);
  }

  @Post('tariff/:eMSPId')
  async pushTariff(@Req() req: any, @Param('eMSPId', ParseIntPipe) eMSPId: number, @Body() dto: PushTariffToEmspDto) {
    return this.adminEmspService.pushTariffUpdateToEmsp(this.clientId(req), eMSPId, dto);
  }

  @Delete(':eMSPId/pushed-tariffs/:tariffId')
  async deleteTariff(@Req() req: any, @Param('eMSPId', ParseIntPipe) eMSPId: number, @Param('tariffId', ParseIntPipe) tariffId: number) {
    return this.adminEmspService.deleteTariffFromEmsp(this.clientId(req), eMSPId, tariffId);
  }

  @Get(':eMSPId/tariff/:chargerId')
  async getStandardTariff(
    @Req() req: any,
    @Param('eMSPId', ParseIntPipe) eMSPId: number,
    @Param('chargerId', ParseIntPipe) chargerId: number,
  ) {
    return this.adminEmspService.getStandardTariffByChargerId(this.clientId(req), eMSPId, chargerId);
  }

  @Get(':eMSPId/pushed-tariffs')
  async getPushedTariffs(@Param('eMSPId', ParseIntPipe) eMSPId: number, @Query() query: any) {
    return this.adminEmspService.getAllPushedTariffs(eMSPId, query);
  }

  @Get(':eMSPId/sessions')
  async getSessions(@Param('eMSPId', ParseIntPipe) eMSPId: number, @Query() query: any) {
    return this.adminEmspService.getAllSessionsOfMsp(eMSPId, query);
  }

  @Get(':eMSPId/sessions-download')
  async downloadSessions(@Param('eMSPId', ParseIntPipe) eMSPId: number, @Body() body: DownloadSessionsDto) {
    // Legacy sends filters as a GET body (`ocpieMSPController.js:downloadSessions`); preserved as-is.
    return this.adminEmspService.downloadSessions(eMSPId, body);
  }

  @Get(':eMSPId/cdrs')
  async getCdrs(@Param('eMSPId', ParseIntPipe) eMSPId: number, @Query() query: any) {
    return this.adminEmspService.getAllCdrsOfMsp(eMSPId, query);
  }

  @Get(':eMSPId/revenue')
  async getRevenue(@Param('eMSPId', ParseIntPipe) eMSPId: number, @Query() query: any) {
    return this.adminEmspService.getRevenueOfMsp(eMSPId, query);
  }

  @Get(':eMSPId/pushed-locations')
  async getPushedLocations(@Req() req: any, @Param('eMSPId', ParseIntPipe) eMSPId: number, @Query() query: any) {
    return this.adminEmspService.getPushedLocationsOfMsp(this.clientId(req), eMSPId, query);
  }

  @Delete(':eMSPId/pushed-locations/:chargerId')
  async removePushedLocation(
    @Req() req: any,
    @Param('eMSPId', ParseIntPipe) eMSPId: number,
    @Param('chargerId', ParseIntPipe) chargerId: number,
  ) {
    return this.adminEmspService.removePushedLocation(this.clientId(req), eMSPId, chargerId);
  }

  @Post(':eMSPId/send-cdr')
  async resendCdr(@Param('eMSPId', ParseIntPipe) eMSPId: number, @Body() dto: SendCdrDto) {
    return this.adminEmspService.resendFailedCdr(eMSPId, dto.sessionId);
  }
}
