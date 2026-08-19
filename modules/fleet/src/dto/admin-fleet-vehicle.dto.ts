export class CreateFleetVehicleDto {
  modelId?: number;
  vinNumber: string;
  autoCharge?: boolean;
  regNo?: string;
  maxAmount?: number;
  fleetGroupId: number;
  fleetId: number;
  capacityId?: number;
}

export class UpdateFleetVehicleDto {
  modelId?: number;
  vinNumber?: string;
  autoCharge?: boolean;
  regNo?: string;
  maxAmount?: number;
  fleetGroupId?: number;
  fleetId?: number;
  capacityId?: number;
}

export class ToggleAutoChargeDto {
  autoCharge: boolean;
}
