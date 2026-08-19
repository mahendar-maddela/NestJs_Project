export class UserRemoteStartDto {
  connectorId: string;
  energy: number;
  amount: number;
  gstNo?: string;
  percentage?: number;
}

export class UserRemoteStopDto {
  transactionId: number;
}
