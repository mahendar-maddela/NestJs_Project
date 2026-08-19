import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { VendorAuthGuard } from '@modules/auth';
import { VendorDeviceTransactionService } from '../services/vendor-device-transaction.service';

@Controller('v1/vendor/device-transaction')
@UseGuards(VendorAuthGuard)
export class VendorDeviceTransactionController {
  constructor(private readonly deviceTransactionService: VendorDeviceTransactionService) { }

  private vendorId(req: any): number {
    return Number(req.vendor?.vendorId || req.user?.id);
  }

  @Get('download')
  async getDownloadDeviceTransactions(
    @Req() req: any,
    @Query('stationIds') stationIds?: string,
    @Query('chargerIds') chargerIds?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('applyGst') applyGst?: string,
  ) {
    return this.deviceTransactionService.getDownloadDeviceTransactions(this.vendorId(req), stationIds, chargerIds, startDate, endDate, applyGst);
  }

  @Get()
  async getAllVendorDeviceTransactions(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('stationId') stationId?: string,
    @Query('chargerId') chargerId?: string,
  ) {
    return this.deviceTransactionService.getAllVendorDeviceTransactions(
      this.vendorId(req),
      Number(page) || 1,
      Number(limit) || 200,
      search,
      status,
      stationId,
      chargerId,
    );
  }
}
