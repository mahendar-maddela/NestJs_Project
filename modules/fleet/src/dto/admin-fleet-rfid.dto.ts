export class CreateFleetRfidTagDto {
  rfIdTag: string;
  expiryDate?: string;
  masterRfidTag?: number | null;
  comments?: string | null;
  maxAmount?: number;
  fleetId: number;
  fleetGroupId: number;
}

export class UpdateFleetRfidTagDto {
  rfIdTag: string;
  expiryDate?: string | null;
  masterRfidTag?: number | null;
  comments?: string | null;
  vendorId?: number | null;
  maxAmount?: number | null;
  staffId?: number | null;
  fleetId?: number | null;
  fleetGroupId?: number | null;
}
