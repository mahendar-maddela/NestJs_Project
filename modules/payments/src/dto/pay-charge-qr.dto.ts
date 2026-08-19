import { IsInt, IsNotEmpty, IsNumber } from 'class-validator';

/** Mirrors `controllers/admin/payAndCharge/qr.controller.js:createQrCodeForPayAndCharge`'s body. */
export class CreateQrCodeForPayAndChargeDto {
  @IsNotEmpty() @IsInt() chargerId: number;
  @IsNotEmpty() @IsNumber() price: number;
  @IsNotEmpty() @IsNumber() gst: number;
}
