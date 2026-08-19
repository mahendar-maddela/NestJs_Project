export class TariffChargerInputDto {
  chargerId: number;
  price?: number;
  gst?: number;
}

export class CreateTariffDto {
  vendorId: number;
  name: string;
  startDate: string;
  endDate: string;
  chargers: TariffChargerInputDto[];
}

export class UpdateTariffDto {
  vendorId: number;
  name?: string;
  startDate?: string;
  endDate?: string;
  chargers?: TariffChargerInputDto[];
}

export class AssignVendorUserOrGroupDto {
  vendorId: number;
  /** Preserves legacy's exact (typo'd) body key `userTypeI`, already used by the deployed frontend. */
  userTypeI: string;
  userIds?: string[];
  groupIds?: number[];
}
