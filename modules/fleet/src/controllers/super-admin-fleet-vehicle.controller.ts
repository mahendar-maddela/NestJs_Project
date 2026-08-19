import { Body, Controller, Get, Param, ParseIntPipe, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { SuperAdminAuthGuard } from '@modules/auth';
import { SuperAdminFleetVehicleService } from '../services/super-admin-fleet-vehicle.service';
import { SuperAdminVehicleAutoChargeUpdateDto } from '../dto/super-admin-fleet.dto';

/** Mirrors `routes/SuperAdmin/fleet/vehicleRoutes.js`. */
@Controller('v1/super-admin/fleet/vehicle')
@UseGuards(SuperAdminAuthGuard)
export class SuperAdminFleetVehicleController {
  constructor(private readonly vehicleService: SuperAdminFleetVehicleService) {}

  private superAdminId(req: any): number {
    return Number(req.user?.sub || req.user?.id || 0);
  }

  @Get(':groupId')
  async getVehiclesBygroupId(@Param('groupId', ParseIntPipe) groupId: number, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.vehicleService.getVehiclesByGroupId(groupId, Number(page) || 1, Number(limit) || 200);
  }

  @Patch('update-autocharge/:id')
  async updateAutoChargeOfVehicleById(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: SuperAdminVehicleAutoChargeUpdateDto) {
    return this.vehicleService.updateAutoChargeOfVehicleById(id, this.superAdminId(req), dto);
  }
}
