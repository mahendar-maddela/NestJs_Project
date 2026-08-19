export class CreateFleetRfidTagDto {
  rfIdTag: string;
  expiryDate?: string | null;
  masterRfidTag?: number | null;
  comments?: string | null;
  vendorId?: number | null;
  maxAmount?: number | null;
  staffId?: number | null;
  fleetGroupId: number;
}

export class UpdateFleetRfidTagDto {
  expiryDate?: string;
  comments?: string;
  maxAmount?: number;
  rfIdTag?: string;
}
