import { Injectable } from '@nestjs/common';
import { ChargerCommandService } from './charger-command.service';
import { AdminOcppRepository } from '../repositories/admin-ocpp.repository';
import {
  ChangeAvailabilityDto,
  ChangeConfigurationDto,
  ResetChargerDto,
  TriggerMessageDto,
  GetConfigurationDto,
  FirmwareUpdateDto,
  DataTransferDto,
} from '../dto/admin-ocpp.dto';

function toHttpResult(result: { success: boolean; message: string }) {
  return { status: result.success ? 200 : 400, body: result };
}

/** Mirrors `controllers/admin/ocpp/adminOcppController.js`. */
@Injectable()
export class AdminOcppService {
  constructor(
    private readonly chargerCommandService: ChargerCommandService,
    private readonly repo: AdminOcppRepository,
  ) {}

  async changeConnectorAvailability(chargerId: string, dto: ChangeAvailabilityDto) {
    const result = await this.chargerCommandService.sendFireAndForgetCommand(chargerId, 'ChangeAvailability', {
      connectorId: Number(dto.connector),
      type: dto.status,
    });
    return toHttpResult(result);
  }

  async changeConfiguration(chargerId: string, dto: ChangeConfigurationDto) {
    const result = await this.chargerCommandService.sendFireAndForgetCommand(chargerId, 'ChangeConfiguration', {
      key: dto.configurationkey,
      value: dto.value,
    });
    if (result.success) {
      await this.repo.updateChargerConfigurationValue(chargerId, dto.configurationkey, dto.value);
    }
    return toHttpResult(result);
  }

  async clearCache(chargerId: string) {
    const result = await this.chargerCommandService.sendFireAndForgetCommand(chargerId, 'ClearCache', {});
    return toHttpResult(result);
  }

  async resetCharger(chargerId: string, dto: ResetChargerDto) {
    const result = await this.chargerCommandService.sendFireAndForgetCommand(chargerId, 'Reset', dto.reset as any);
    return toHttpResult(result);
  }

  async triggerMessage(chargerId: string, dto: TriggerMessageDto) {
    const result = await this.chargerCommandService.sendFireAndForgetCommand(chargerId, 'TriggerMessage', {
      connectorId: Number(dto.connectorId),
      requestedMessage: dto.message,
    });
    return toHttpResult(result);
  }

  async getConfigurationRequest(chargerId: string, dto: GetConfigurationDto) {
    const requestData = dto.selectedOptions?.map((option) => option.value);
    const result = await this.chargerCommandService.sendFireAndForgetCommand(chargerId, 'GetConfiguration', { key: requestData });
    return toHttpResult(result);
  }

  async getAllChargerConfiguration(chargerRef: string) {
    const config = await this.repo.findAllChargerConfiguration(chargerRef);
    return { status: 200, body: { success: true, message: 'Configuration fetched successfully', data: config } };
  }

  async getAllLogConfig(chargerRef: string) {
    const logConfig = await this.repo.findAllLogConfig(chargerRef);
    return { status: 200, body: { success: true, message: 'Log configuration fetched successfully', data: logConfig } };
  }

  async sendFirmwareUpdate(chargerId: string, dto: FirmwareUpdateDto) {
    const result = await this.chargerCommandService.sendFireAndForgetCommand(chargerId, 'UpdateFirmware', {
      location: dto.location,
      retries: dto.retries,
      retryInterval: dto.retryInterval,
      retrieveDate: dto.retrieveDate ? new Date(dto.retrieveDate).toISOString() : new Date().toISOString(),
    });
    return toHttpResult(result);
  }

  async sendDataTransfer(chargerId: string, dto: DataTransferDto) {
    const result = await this.chargerCommandService.sendFireAndForgetCommand(chargerId, 'DataTransfer', {
      vendorId: dto.vendorId,
      messageId: dto.messageId,
      data: dto.data,
    });
    return toHttpResult(result);
  }
}
