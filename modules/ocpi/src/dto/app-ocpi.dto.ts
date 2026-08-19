export class AppOcpiStartSessionDto {
  charger_id: string;
  amount: number;
  connector_id: string;
}

export class AppOcpiStopSessionDto {
  session_id: string;
  evseId: string;
}
