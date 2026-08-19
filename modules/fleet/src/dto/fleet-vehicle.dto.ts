export class CreateFleetVehicleDto {
  vinNumber: string;
  modelId?: number;
  regNo?: string;
  maxAmount?: number;
  capacityId?: number;
  fleetGroupId?: number;
  range?: number;
  isPrimary?: boolean;
  /** Not persisted — legacy derives `autoCharge` from this field. */
  type?: string;
}

export class UpdateFleetVehicleDto {
  vinNumber?: string;
  modelId?: number;
  regNo?: string;
  maxAmount?: number;
  capacityId?: number;
  fleetGroupId?: number;
  range?: number;
  isPrimary?: boolean;
  autoCharge?: boolean;
}

export class FleetToggleAutoChargeDto {
  autoCharge: boolean;
}
