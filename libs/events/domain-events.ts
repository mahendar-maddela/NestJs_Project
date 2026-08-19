export class SessionStartedEvent {
  constructor(
    public readonly sessionId: number,
    public readonly transactionId: number,
    public readonly chargerId: string,
    public readonly userId: number | null,
    public readonly fleetId: number | null,
    public readonly clientId: number,
  ) {}
}

export class SessionStoppedEvent {
  constructor(
    public readonly sessionId: number,
    public readonly transactionId: number,
    public readonly totalKWh: number,
    public readonly totalAmount: number,
    public readonly reason: string,
    public readonly clientId: number,
  ) {}
}

export class PaymentSuccessEvent {
  constructor(
    public readonly paymentTransactionId: number,
    public readonly orderId: string,
    public readonly amount: number,
    public readonly userId: number,
    public readonly clientId: number,
  ) {}
}

export class ChargerStatusChangedEvent {
  constructor(
    public readonly chargerId: string,
    public readonly connectorId: string,
    public readonly status: string,
    public readonly vendorId: number,
    public readonly clientId: number,
  ) {}
}
