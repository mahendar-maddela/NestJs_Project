import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { SuperAdminAuthGuard } from '@modules/auth';
import { SuperAdminTariffService } from '../services/super-admin-tariff.service';

/** Mirrors `routes/SuperAdmin/tariffRoutes.js` + `controllers/suparAdmin/tariffController.js`. */
@Controller('v1/super-admin/tariff')
@UseGuards(SuperAdminAuthGuard)
export class SuperAdminTariffController {
  constructor(private readonly tariffService: SuperAdminTariffService) {}

  @Get('type/:tarrifId')
  async getTariffByTypeId(@Param('tarrifId', ParseIntPipe) tarrifId: number) {
    return this.tariffService.getTariffByTypeId(tarrifId);
  }

  @Get('user/:tarrifId')
  async getUsersAssignedByTariffTypeId(@Param('tarrifId', ParseIntPipe) tarrifId: number) {
    return this.tariffService.getUsersAssignedByTariffTypeId(tarrifId);
  }

  @Get(':vendorId')
  async getTariffsByVendor(@Param('vendorId', ParseIntPipe) vendorId: number) {
    return this.tariffService.getTariffsByVendor(vendorId);
  }
}
