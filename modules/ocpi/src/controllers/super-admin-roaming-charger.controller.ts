import { Body, Controller, Post, Put, UseGuards } from '@nestjs/common';
import { SuperAdminAuthGuard } from '@modules/auth';
import { SuperAdminRoamingService } from '../services/super-admin-roaming.service';
import { SuperAdminAddImportRoamingDto, SuperAdminUpdateRoamingTariffDto } from '../dto/super-admin-roaming.dto';

/** Mirrors `routes/SuperAdmin/InternalRoaming/charger.routes.js`. */
@Controller('v1/super-admin/roaming/charger')
@UseGuards(SuperAdminAuthGuard)
export class SuperAdminRoamingChargerController {
  constructor(private readonly roamingService: SuperAdminRoamingService) {}

  @Post('import')
  async addImportRoaming(@Body() dto: SuperAdminAddImportRoamingDto) {
    return this.roamingService.addImportRoaming(dto);
  }

  @Put('tariff')
  async updateRoamingTariff(@Body() dto: SuperAdminUpdateRoamingTariffDto) {
    return this.roamingService.updateRoamingTariff(dto);
  }
}
