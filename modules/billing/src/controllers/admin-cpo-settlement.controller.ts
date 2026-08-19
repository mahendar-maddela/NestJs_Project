import { Body, Controller, Get, Param, ParseIntPipe, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AdminAuthGuard, StaffPermissionsGuard, StaffPermission } from '@modules/auth';
import { AdminCpoSettlementService } from '../services/admin-cpo-settlement.service';
import { SettleNowDto, SettleNowBulkDto } from '../dto/admin-cpo-settlement.dto';

/** Mirrors `routes/admin/cpoSettlementRoutes.js` + `controllers/admin/cpoSettlementController.js`. */
@Controller('v1/admin/settlement')
@UseGuards(AdminAuthGuard, StaffPermissionsGuard)
@StaffPermission('CPO_Settlement_Management')
export class AdminCpoSettlementController {
  constructor(private readonly settlementService: AdminCpoSettlementService) {}

  private clientId(req: any): number {
    return Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 0);
  }

  @Get()
  async getCpoList(@Req() req: any) {
    return this.settlementService.getCpoList(this.clientId(req));
  }

  @Get('due/:vendorId')
  async getVendorDueSettlementDetails(
    @Req() req: any,
    @Param('vendorId', ParseIntPipe) vendorId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.settlementService.getVendorDueSettlementDetails(vendorId, this.clientId(req), Number(page) || 1, Number(limit) || 200);
  }

  @Get('charger/settle/:chargerId')
  async getSingleChargerSettlementDetails(
    @Req() req: any,
    @Param('chargerId', ParseIntPipe) chargerId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.settlementService.getSingleChargerSettlementDetails(chargerId, this.clientId(req), Number(page) || 1, Number(limit) || 50);
  }

  @Get('charger/:vendorId')
  async getVendorChargersSettlementDetails(@Req() req: any, @Param('vendorId', ParseIntPipe) vendorId: number) {
    return this.settlementService.getVendorChargersSettlementDetails(vendorId, this.clientId(req));
  }

  @Put()
  async settleNowBulk(@Req() req: any, @Body() dto: SettleNowBulkDto) {
    return this.settlementService.settleNowBulk(this.clientId(req), dto);
  }

  @Put(':settlementId')
  async settleNow(@Req() req: any, @Param('settlementId', ParseIntPipe) settlementId: number, @Body() dto: SettleNowDto) {
    return this.settlementService.settleNow(settlementId, this.clientId(req), dto);
  }
}
