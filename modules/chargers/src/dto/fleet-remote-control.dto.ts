export class FleetRemoteStartDto {
  connectorId: string;
  chargerId: string;
  energy?: number;
  amount: number;
  fleetGroupId?: number;
}

export class FleetRemoteStopDto {
  transactionId: number;
  chargerId: string;
}
