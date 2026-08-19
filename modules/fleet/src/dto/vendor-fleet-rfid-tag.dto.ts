export class CreateVendorFleetRfidTagDto {
  rfIdTag: string;
  expiryDate?: string;
  masterRfidTag?: number | null;
  comments?: string | null;
  maxAmount?: number;
  fleetId: number;
  fleetGroupId: number;
}

export class UpdateVendorFleetRfidTagDto {
  rfIdTag: string;
  expiryDate?: string;
  masterRfidTag?: number;
  comments?: string;
  maxAmount?: number;
  fleetId: number;
  fleetGroupId: number;
}
