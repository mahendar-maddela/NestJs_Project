export class RoamingChargerInputDto {
  chargerId: number;
  roamingPrice?: number;
  roamingGst?: number;
}

export class AddExportRoamingChargersDto {
  importClientId: number;
  chargers: RoamingChargerInputDto[];
}

export class RoamingChargerStatusUpdateDto {
  importClientId: number;
  chargerId: number;
  status: string;
}

export class UpdateRoamingTariffDto {
  importClientId: number;
  chargerId: number;
  roamingPrice: number;
  roamingGst: number;
}

export class RoamingClientStatusUpdateDto {
  status: string;
}
