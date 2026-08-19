import { Body, Controller, Get, ParseIntPipe, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AdminAuthGuard, ClientFeaturesGuard, ClientFeatureRequired, StaffPermissionsGuard, StaffPermission } from '@modules/auth';
import { AdminPayChargeQrService } from '../services/admin-pay-charge-qr.service';
import { CreateQrCodeForPayAndChargeDto } from '../dto/pay-charge-qr.dto';

function clientId(req: any): number {
  return Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 0);
}

/** Mirrors `routes/admin/chargerRoutes.js`'s `/qr/generate` and `/qr/download/:chargerId/:connectorId/:qrProviderId`. */
@Controller('v1/admin/charger')
@UseGuards(AdminAuthGuard, ClientFeaturesGuard, StaffPermissionsGuard)
@ClientFeatureRequired('QR Pay & Charge')
export class AdminPayChargeQrController {
  constructor(private readonly qrService: AdminPayChargeQrService) {}

  @Post('qr/generate')
  @StaffPermission('Charger_View')
  async createQrCodeForPayAndCharge(@Req() req: any, @Body() dto: CreateQrCodeForPayAndChargeDto) {
    return this.qrService.createQrCodeForPayAndCharge(clientId(req), dto.chargerId, dto.price, dto.gst);
  }

  @Get('qr/download/:chargerId/:connectorId/:qrProviderId')
  @StaffPermission('Charger_View')
  async downloadQrCodeForPayAndCharge(
    @Req() req: any,
    @Param('chargerId', ParseIntPipe) chargerId: number,
    @Param('connectorId', ParseIntPipe) connectorId: number,
    @Param('qrProviderId') qrProviderId: string,
  ) {
    return this.qrService.downloadQrCodeForPayAndCharge(clientId(req), chargerId, connectorId, qrProviderId);
  }
}
