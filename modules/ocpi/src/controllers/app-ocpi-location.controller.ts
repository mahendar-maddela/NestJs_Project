import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { UserAuthGuard } from '@modules/auth';
import { AppOcpiLocationService } from '../services/app-ocpi-location.service';

/** Mirrors `routes/app/ocpi/locationsRoutes.js`. */
@Controller('v1/ocpi/locations')
@UseGuards(UserAuthGuard)
export class AppOcpiLocationController {
  constructor(private readonly locationService: AppOcpiLocationService) {}

  @Get('evse/:id')
  async getOcpiEvseById(@Param('id') id: string) {
    return this.locationService.getOcpiEvseById(id);
  }

  @Get(':id')
  async getOcpiLocationById(@Param('id', ParseIntPipe) id: number) {
    return this.locationService.getOcpiLocationById(id);
  }
}
