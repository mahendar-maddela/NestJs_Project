import { IsInt, IsNotEmpty, IsOptional } from 'class-validator';

/** Mirrors the `amount`/`couponId` body of `controllers/APP/paymentGatewayController.js:createRazorpayOrder` (also used by `v1/web/payment`). */
export class CreateRazorpayOrderDto {
  @IsNotEmpty() @IsInt() amount: number;
  @IsOptional() @IsInt() couponId?: number;
}

/** Mirrors `controllers/Fleet/paymentTransactions.js:createFleetRazorpayOrder`'s body. */
export class CreateFleetRazorpayOrderDto {
  @IsNotEmpty() amount: number;
  @IsOptional() @IsInt() couponId?: number;
}
