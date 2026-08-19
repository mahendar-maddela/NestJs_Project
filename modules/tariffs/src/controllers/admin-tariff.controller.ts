import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { AdminAuthGuard, ClientFeaturesGuard, ClientFeatureRequired, StaffPermissionsGuard, StaffPermission } from '@modules/auth';
import { AdminTariffService } from '../services/admin-tariff.service';
import { CreateTariffDto, UpdateTariffDto, AssignVendorUserOrGroupDto } from '../dto/admin-tariff.dto';

/** Mirrors `routes/admin/tariffRoutes.js` + `controllers/admin/tariffController.js`. */
@Controller('v1/admin/tariff')
@UseGuards(AdminAuthGuard, ClientFeaturesGuard, StaffPermissionsGuard)
@ClientFeatureRequired('Dynamic Tariff')
@StaffPermission('CPO_Manage_Tariff')
export class AdminTariffController {
  constructor(private readonly tariffService: AdminTariffService) {}

  private clientId(req: any): number {
    return Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 0);
  }

  @Post()
  async createTariffAdmin(@Req() req: any, @Body() dto: CreateTariffDto) {
    const staffId = req.user?.id || req.user?.sub;
    return this.tariffService.createTariffAdmin(this.clientId(req), staffId, dto);
  }

  @Get('chargers/:vendorId')
  async getAllChargersByVendorId(@Req() req: any, @Param('vendorId', ParseIntPipe) vendorId: number) {
    return this.tariffService.getAllChargersByVendorId(vendorId, this.clientId(req));
  }

  @Get('type/:userTypeId')
  async getTariffById(@Req() req: any, @Param('userTypeId', ParseIntPipe) userTypeId: number) {
    return this.tariffService.getTariffById(userTypeId, this.clientId(req));
  }

  @Get('user/:userTypeId')
  async getAllAssignedUserVendorUserTypes(@Req() req: any, @Param('userTypeId', ParseIntPipe) userTypeId: number) {
    return this.tariffService.getAllAssignedUserVendorUserTypes(userTypeId, this.clientId(req));
  }

  @Put('user/:userTypeId')
  async assignUserOrGroupsVendorUserType(
    @Req() req: any,
    @Param('userTypeId', ParseIntPipe) userTypeId: number,
    @Body() dto: AssignVendorUserOrGroupDto,
  ) {
    return this.tariffService.assignUserOrGroupsVendorUserType(userTypeId, this.clientId(req), dto);
  }

  @Delete('user/:userTypeId')
  async deleteVendorUserAdmin(@Req() req: any, @Param('userTypeId', ParseIntPipe) id: number) {
    return this.tariffService.deleteVendorUserAdmin(id, this.clientId(req));
  }

  @Get(':vendorId')
  async getAllTariffByVendor(@Req() req: any, @Param('vendorId', ParseIntPipe) vendorId: number) {
    return this.tariffService.getAllTariffByVendor(vendorId, this.clientId(req));
  }

  @Put(':userTypeId')
  async updateTariffAdmin(@Req() req: any, @Param('userTypeId', ParseIntPipe) userTypeId: number, @Body() dto: UpdateTariffDto) {
    return this.tariffService.updateTariffAdmin(userTypeId, this.clientId(req), dto);
  }

  @Delete(':userTypeId')
  async deleteTariffAdmin(@Req() req: any, @Param('userTypeId', ParseIntPipe) userTypeId: number) {
    return this.tariffService.deleteTariffAdmin(userTypeId, this.clientId(req));
  }
}
