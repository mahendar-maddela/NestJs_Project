export class SettleNowDto {
  settledDate: string;
}

export class SettleNowBulkDto {
  settledDate: string;
  refNo?: string;
  settlementIds: number[];
}
