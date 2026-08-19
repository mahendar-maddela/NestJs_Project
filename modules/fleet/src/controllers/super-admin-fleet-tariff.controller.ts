import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { SuperAdminAuthGuard } from '@modules/auth';
import { SuperAdminFleetTariffService } from '../services/super-admin-fleet-tariff.service';

/** Mirrors `routes/SuperAdmin/fleet/tariffRoutes.js`. */
@Controller('v1/super-admin/fleet/tariff')
@UseGuards(SuperAdminAuthGuard)
export class SuperAdminFleetTariffController {
  constructor(private readonly tariffService: SuperAdminFleetTariffService) {}

  @Get(':groupId')
  async getTariffsByFleetGroupId(@Param('groupId', ParseIntPipe) groupId: number) {
    return this.tariffService.getTariffsByFleetGroupId(groupId);
  }

  @Get('charger/:userTypeId')
  async getTariffsByUserTypeId(@Param('userTypeId', ParseIntPipe) userTypeId: number) {
    return this.tariffService.getTariffsByUserTypeId(userTypeId);
  }
}
