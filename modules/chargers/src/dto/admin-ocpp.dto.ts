export class ChangeAvailabilityDto {
  connector: number;
  status: string;
}

export class ChangeConfigurationDto {
  configurationkey: string;
  value: string;
}

export class ResetChargerDto {
  reset: string;
}

export class TriggerMessageDto {
  connectorId: number;
  message: string;
}

export class GetConfigurationDto {
  selectedOptions?: { value: string }[];
}

export class FirmwareUpdateDto {
  location: string;
  retries?: number;
  retryInterval?: number;
  retrieveDate?: string;
}

export class DataTransferDto {
  vendorId: string;
  messageId?: string;
  data?: string;
}
