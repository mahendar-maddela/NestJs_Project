import { RoamingChargerInputDto } from './admin-roaming.dto';

export class SuperAdminAddImportRoamingDto {
  exportClientId: number;
  importClientId: number;
  chargers: RoamingChargerInputDto[];
}

export class SuperAdminUpdateRoamingTariffDto {
  exportClientId: number;
  importClientId: number;
  chargerId: number;
  roamingPrice: number;
  roamingGst: number;
}

export class ConnectClientToInternalRoamingDto {
  exportClientId: number;
  importClientId: number;
}
