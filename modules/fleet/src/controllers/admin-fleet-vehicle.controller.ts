import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AdminAuthGuard, ClientFeaturesGuard, ClientFeatureRequired, StaffPermissionsGuard, StaffPermission } from '@modules/auth';
import { AdminFleetVehicleService } from '../services/admin-fleet-vehicle.service';
import { CreateFleetVehicleDto, UpdateFleetVehicleDto, ToggleAutoChargeDto } from '../dto/admin-fleet-vehicle.dto';

/** Mirrors `routes/admin/fleet/vehicleRoutes.js` + `controllers/admin/fleet/vehicleController.js`. */
@Controller('v1/admin/fleet/vehicle')
@UseGuards(AdminAuthGuard, ClientFeaturesGuard, StaffPermissionsGuard)
@ClientFeatureRequired('Fleet Module')
export class AdminFleetVehicleController {
  constructor(private readonly vehicleService: AdminFleetVehicleService) {}

  private clientId(req: any): number {
    return Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 0);
  }

  @Post()
  @StaffPermission('Fleet_Manage')
  async createVehicle(@Req() req: any, @Body() dto: CreateFleetVehicleDto) {
    return this.vehicleService.createVehicle(this.clientId(req), dto);
  }

  @Get(':groupId')
  @StaffPermission('Fleet_View')
  async getAllVehicles(
    @Req() req: any,
    @Param('groupId', ParseIntPipe) groupId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.vehicleService.getAllVehicles(groupId, this.clientId(req), Number(page) || 1, Number(limit) || 200);
  }

  @Put(':vehicleId')
  @StaffPermission('Fleet_Manage')
  async updateVehicle(@Req() req: any, @Param('vehicleId', ParseIntPipe) vehicleId: number, @Body() dto: UpdateFleetVehicleDto) {
    return this.vehicleService.updateVehicle(vehicleId, this.clientId(req), dto);
  }

  @Patch(':id')
  @StaffPermission('Fleet_Manage')
  async toggleAutoCharge(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: ToggleAutoChargeDto) {
    return this.vehicleService.toggleAutoCharge(id, this.clientId(req), dto);
  }
}
