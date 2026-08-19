import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AdminCpoService } from '../services/admin-cpo.service';
import { AdminAuthGuard, StaffPermissionsGuard, StaffPermission } from '@modules/auth';
import {
  CancelSessionDto,
  CreateOcpiCpoDto,
  RemoteStartSessionDto,
  RemoteStopSessionDto,
  SendCpoVersionsEndpointsDto,
  UpdateOcpiCpoDto,
} from '../dto/admin-cpo.dto';

/**
 * Admin management of roaming CPO partners we connect to as eMSP.
 * Mirrors legacy `v1/admin/ocpi-cpo/*` (`src/routes/admin/ocpi/ocpiCPORoutes.js`).
 * Route order mirrors legacy: specific `:cpoId/...` paths are declared before the
 * generic `:ocpiCpoId` lookup so Nest's router does not swallow them.
 */
@Controller('v1/admin/ocpi-cpo')
@UseGuards(AdminAuthGuard, StaffPermissionsGuard)
@StaffPermission('OCPI_CPO_Management')
export class AdminOcpiCpoController {
  constructor(private readonly adminCpoService: AdminCpoService) {}

  private clientId(req: any): number {
    return Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 1);
  }

  @Get()
  async findAll(@Req() req: any, @Query() query: any) {
    return this.adminCpoService.getAllCpos(this.clientId(req), query);
  }

  @Get(':cpoId/handshake')
  async handshake(@Req() req: any, @Param('cpoId', ParseIntPipe) cpoId: number) {
    return this.adminCpoService.handshake(this.clientId(req), cpoId);
  }

  @Get(':cpoId/versions')
  async sendVersionsRequest(@Req() req: any, @Param('cpoId', ParseIntPipe) cpoId: number) {
    return this.adminCpoService.sendVersionsRequest(this.clientId(req), cpoId);
  }

  @Get(':cpoId/locations')
  async getAllLocations(@Req() req: any, @Param('cpoId', ParseIntPipe) cpoId: number, @Query() query: any) {
    return this.adminCpoService.getAllLocationsByCpoId(this.clientId(req), cpoId, query);
  }

  @Get(':cpoId/locations/:locationId')
  async getLocationById(
    @Req() req: any,
    @Param('cpoId', ParseIntPipe) cpoId: number,
    @Param('locationId', ParseIntPipe) locationId: number,
  ) {
    return this.adminCpoService.getLocationById(this.clientId(req), cpoId, locationId);
  }

  @Get(':cpoId/tariffs')
  async getAllTariffs(@Req() req: any, @Param('cpoId', ParseIntPipe) cpoId: number, @Query() query: any) {
    return this.adminCpoService.getAllTariffsByCpoId(this.clientId(req), cpoId, query);
  }

  @Get(':cpoId/sessions')
  async getAllSessions(@Req() req: any, @Param('cpoId', ParseIntPipe) cpoId: number, @Query() query: any) {
    return this.adminCpoService.getAllSessionsByCpoId(this.clientId(req), cpoId, query);
  }

  @Get(':cpoId/cdrs')
  async getCdrs(@Req() req: any, @Param('cpoId', ParseIntPipe) cpoId: number, @Query() query: any) {
    return this.adminCpoService.getCdrsByCpoId(this.clientId(req), cpoId, query);
  }

  @Get(':cpoId/sessions/download')
  async downloadSessions(@Req() req: any, @Param('cpoId', ParseIntPipe) cpoId: number, @Query() query: any) {
    return this.adminCpoService.downloadSessionByCpoId(this.clientId(req), cpoId, query);
  }

  @Get(':cpoId/cdrs/download')
  async downloadCdrs(@Req() req: any, @Param('cpoId', ParseIntPipe) cpoId: number, @Query() query: any) {
    return this.adminCpoService.downloadCdrsByCpoId(this.clientId(req), cpoId, query);
  }

  @Get(':cpoId/cdrs/:cdrId')
  async getCdrById(@Req() req: any, @Param('cpoId', ParseIntPipe) cpoId: number, @Param('cdrId', ParseIntPipe) cdrId: number) {
    return this.adminCpoService.getCdrById(this.clientId(req), cpoId, cdrId);
  }

  @Get(':cpoId/revenue')
  async getMonthlyAnalytics(@Req() req: any, @Param('cpoId', ParseIntPipe) cpoId: number, @Query() query: any) {
    return this.adminCpoService.getMonthlyAnalytics(this.clientId(req), cpoId, query);
  }

  @Get(':cpoId/revenue/card')
  async getRevenueCard(@Req() req: any, @Param('cpoId', ParseIntPipe) cpoId: number) {
    return this.adminCpoService.getRevenueCard(this.clientId(req), cpoId);
  }

  @Get(':cpoId/evse/:evseId')
  async getEvseById(@Param('cpoId', ParseIntPipe) cpoId: number, @Param('evseId', ParseIntPipe) evseId: number) {
    return this.adminCpoService.getEvseById(cpoId, evseId);
  }

  @Get(':cpoId/transaction/:evseId')
  async getTransactionByEvseId(@Param('cpoId', ParseIntPipe) cpoId: number, @Param('evseId', ParseIntPipe) evseId: number, @Query() query: any) {
    return this.adminCpoService.getTransactionByEvseId(cpoId, evseId, query);
  }

  @Get(':cpoId/session/:evseId')
  async getInitiatedSessionByEvseId(@Param('evseId', ParseIntPipe) evseId: number, @Query() query: any) {
    return this.adminCpoService.getInitiatedSessionsByEvseId(evseId, query);
  }

  @Post(':cpoId/start-session')
  async startSession(@Req() req: any, @Param('cpoId', ParseIntPipe) cpoId: number, @Body() dto: RemoteStartSessionDto) {
    return this.adminCpoService.remoteStartSession(this.clientId(req), cpoId, dto);
  }

  @Post(':cpoId/stop-session')
  async stopSession(@Req() req: any, @Param('cpoId', ParseIntPipe) cpoId: number, @Body() dto: RemoteStopSessionDto) {
    return this.adminCpoService.remoteStopSession(this.clientId(req), cpoId, dto);
  }

  @Post(':cpoId/cancel-session')
  async cancelSession(@Req() req: any, @Param('cpoId', ParseIntPipe) cpoId: number, @Body() dto: CancelSessionDto) {
    return this.adminCpoService.cancelSession(this.clientId(req), cpoId, dto);
  }

  @Get(':ocpiCpoId')
  async findOne(@Req() req: any, @Param('ocpiCpoId', ParseIntPipe) ocpiCpoId: number) {
    return this.adminCpoService.getCpoById(this.clientId(req), ocpiCpoId);
  }

  @Post(':cpoId/versions')
  async sendVersionsEndpointsRequest(
    @Req() req: any,
    @Param('cpoId', ParseIntPipe) cpoId: number,
    @Body() dto: SendCpoVersionsEndpointsDto,
  ) {
    return this.adminCpoService.sendVersionsEndpointsRequest(this.clientId(req), cpoId, dto.version);
  }

  @Post()
  async create(@Req() req: any, @Body() dto: CreateOcpiCpoDto) {
    return this.adminCpoService.createCpo(this.clientId(req), dto);
  }

  @Put(':ocpiCpoId')
  async update(@Req() req: any, @Param('ocpiCpoId', ParseIntPipe) ocpiCpoId: number, @Body() dto: UpdateOcpiCpoDto) {
    return this.adminCpoService.updateCpo(this.clientId(req), ocpiCpoId, dto);
  }
}
