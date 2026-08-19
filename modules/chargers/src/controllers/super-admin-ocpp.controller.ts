import { Body, Controller, Get, Param, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { SuperAdminAuthGuard } from '@modules/auth';
import { AdminOcppService } from '../services/admin-ocpp.service';
import {
  ChangeAvailabilityDto,
  ChangeConfigurationDto,
  ResetChargerDto,
  TriggerMessageDto,
  GetConfigurationDto,
  FirmwareUpdateDto,
  DataTransferDto,
} from '../dto/admin-ocpp.dto';

/** Mirrors `routes/SuperAdmin/ocppRoutes.js`, which reuses `controllers/admin/ocpp/adminOcppController.js` directly. */
@Controller('v1/super-admin/ocpp-config')
@UseGuards(SuperAdminAuthGuard)
export class SuperAdminOcppController {
  constructor(private readonly ocppService: AdminOcppService) {}

  @Get('configuration/:chargerId')
  async getAllChargerConfiguration(@Param('chargerId') chargerId: string) {
    const { body } = await this.ocppService.getAllChargerConfiguration(chargerId);
    return body;
  }

  @Get('log-config/:chargerId')
  async getAllLogConfig(@Param('chargerId') chargerId: string) {
    const { body } = await this.ocppService.getAllLogConfig(chargerId);
    return body;
  }

  @Post('availability/:chargerId')
  async changeConnectorAvailability(@Param('chargerId') chargerId: string, @Body() dto: ChangeAvailabilityDto, @Res() res: Response) {
    const { status, body } = await this.ocppService.changeConnectorAvailability(chargerId, dto);
    res.status(status).json(body);
  }

  @Post('clear-cache/:chargerId')
  async clearCache(@Param('chargerId') chargerId: string, @Res() res: Response) {
    const { status, body } = await this.ocppService.clearCache(chargerId);
    res.status(status).json(body);
  }

  @Post('reset/:chargerId')
  async resetCharger(@Param('chargerId') chargerId: string, @Body() dto: ResetChargerDto, @Res() res: Response) {
    const { status, body } = await this.ocppService.resetCharger(chargerId, dto);
    res.status(status).json(body);
  }

  @Post('message-trigger/:chargerId')
  async triggerMessage(@Param('chargerId') chargerId: string, @Body() dto: TriggerMessageDto, @Res() res: Response) {
    const { status, body } = await this.ocppService.triggerMessage(chargerId, dto);
    res.status(status).json(body);
  }

  @Post('change-configuration/:chargerId')
  async changeConfiguration(@Param('chargerId') chargerId: string, @Body() dto: ChangeConfigurationDto, @Res() res: Response) {
    const { status, body } = await this.ocppService.changeConfiguration(chargerId, dto);
    res.status(status).json(body);
  }

  @Post('get-configuration/:chargerId')
  async getConfigurationRequest(@Param('chargerId') chargerId: string, @Body() dto: GetConfigurationDto, @Res() res: Response) {
    const { status, body } = await this.ocppService.getConfigurationRequest(chargerId, dto);
    res.status(status).json(body);
  }

  @Post('firmware-update/:chargerId')
  async sendFirmwareUpdate(@Param('chargerId') chargerId: string, @Body() dto: FirmwareUpdateDto, @Res() res: Response) {
    const { status, body } = await this.ocppService.sendFirmwareUpdate(chargerId, dto);
    res.status(status).json(body);
  }

  @Post('data-transfer/:chargerId')
  async sendDataTransfer(@Param('chargerId') chargerId: string, @Body() dto: DataTransferDto, @Res() res: Response) {
    const { status, body } = await this.ocppService.sendDataTransfer(chargerId, dto);
    res.status(status).json(body);
  }
}
