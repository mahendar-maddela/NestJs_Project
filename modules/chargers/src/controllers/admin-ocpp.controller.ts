import { Body, Controller, Get, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AdminAuthGuard, StaffPermissionsGuard, StaffPermission } from '@modules/auth';
import { AdminOcppService } from '../services/admin-ocpp.service';
import { AdminRemoteControlService } from '../services/admin-remote-control.service';
import {
  ChangeAvailabilityDto,
  ChangeConfigurationDto,
  ResetChargerDto,
  TriggerMessageDto,
  GetConfigurationDto,
  FirmwareUpdateDto,
  DataTransferDto,
} from '../dto/admin-ocpp.dto';
import { AdminRemoteStartDto, AdminRemoteStopDto } from '../dto/admin-remote-control.dto';

/** Mirrors `routes/admin/adminOcppRoutes.js` + `controllers/admin/ocpp/adminOcppController.js`. */
@Controller('v1/admin/ocpp')
@UseGuards(AdminAuthGuard, StaffPermissionsGuard)
export class AdminOcppController {
  constructor(
    private readonly ocppService: AdminOcppService,
    private readonly remoteControlService: AdminRemoteControlService,
  ) {}

  private clientId(req: any): number {
    return Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 0);
  }

  @Post('start/:chargerId')
  @StaffPermission('Charger_Manage_Remote_Controller')
  async adminHandleRemoteStart(
    @Req() req: any,
    @Param('chargerId') chargerId: string,
    @Query('platform') platform: string | undefined,
    @Body() dto: AdminRemoteStartDto,
  ) {
    return this.remoteControlService.adminHandleRemoteStart(chargerId, this.clientId(req), platform, dto);
  }

  @Post('stop/:chargerId')
  @StaffPermission('Charger_Manage_Remote_Controller')
  async handleRemoteStop(
    @Req() req: any,
    @Param('chargerId') chargerId: string,
    @Query('platform') platform: string | undefined,
    @Body() dto: AdminRemoteStopDto,
  ) {
    return this.remoteControlService.handleRemoteStop(chargerId, this.clientId(req), platform, dto);
  }

  @Post('availability/:chargerId')
  @StaffPermission('Charger_Manage_Config')
  async changeConnectorAvailability(@Param('chargerId') chargerId: string, @Body() dto: ChangeAvailabilityDto, @Res() res: Response) {
    const { status, body } = await this.ocppService.changeConnectorAvailability(chargerId, dto);
    res.status(status).json(body);
  }

  @Post('clear-cache/:chargerId')
  @StaffPermission('Charger_Manage_Config')
  async clearCache(@Param('chargerId') chargerId: string, @Res() res: Response) {
    const { status, body } = await this.ocppService.clearCache(chargerId);
    res.status(status).json(body);
  }

  @Post('reset/:chargerId')
  @StaffPermission('Charger_Manage_Config')
  async resetCharger(@Param('chargerId') chargerId: string, @Body() dto: ResetChargerDto, @Res() res: Response) {
    const { status, body } = await this.ocppService.resetCharger(chargerId, dto);
    res.status(status).json(body);
  }

  @Post('message-trigger/:chargerId')
  @StaffPermission('Charger_Manage_Config')
  async triggerMessage(@Param('chargerId') chargerId: string, @Body() dto: TriggerMessageDto, @Res() res: Response) {
    const { status, body } = await this.ocppService.triggerMessage(chargerId, dto);
    res.status(status).json(body);
  }

  @Post('change-configuration/:chargerId')
  @StaffPermission('Charger_Manage_Config')
  async changeConfiguration(@Param('chargerId') chargerId: string, @Body() dto: ChangeConfigurationDto, @Res() res: Response) {
    const { status, body } = await this.ocppService.changeConfiguration(chargerId, dto);
    res.status(status).json(body);
  }

  @Post('get-configuration/:chargerId')
  @StaffPermission('Charger_Manage_Config')
  async getConfigurationRequest(@Param('chargerId') chargerId: string, @Body() dto: GetConfigurationDto, @Res() res: Response) {
    const { status, body } = await this.ocppService.getConfigurationRequest(chargerId, dto);
    res.status(status).json(body);
  }

  @Get('configuration/:chargerId')
  @StaffPermission('Charger_View')
  async getAllChargerConfiguration(@Param('chargerId') chargerId: string) {
    const { body } = await this.ocppService.getAllChargerConfiguration(chargerId);
    return body;
  }

  @Get('log-config/:chargerId')
  @StaffPermission('Charger_View')
  async getAllLogConfig(@Param('chargerId') chargerId: string) {
    const { body } = await this.ocppService.getAllLogConfig(chargerId);
    return body;
  }

  @Post('firmware-update/:chargerId')
  @StaffPermission('Charger_Manage_Config')
  async sendFirmwareUpdate(@Param('chargerId') chargerId: string, @Body() dto: FirmwareUpdateDto, @Res() res: Response) {
    const { status, body } = await this.ocppService.sendFirmwareUpdate(chargerId, dto);
    res.status(status).json(body);
  }

  @Post('data-transfer/:chargerId')
  @StaffPermission('Charger_Manage_Config')
  async sendDataTransfer(@Param('chargerId') chargerId: string, @Body() dto: DataTransferDto, @Res() res: Response) {
    const { status, body } = await this.ocppService.sendDataTransfer(chargerId, dto);
    res.status(status).json(body);
  }
}
