import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { SuperAdminAuthGuard } from '@modules/auth';
import { SuperAdminFleetVehicleGroupService } from '../services/super-admin-fleet-vehicle-group.service';

/** Mirrors `routes/SuperAdmin/fleet/vehicleGroupRoutes.js`. */
@Controller('v1/super-admin/fleet/group')
@UseGuards(SuperAdminAuthGuard)
export class SuperAdminFleetVehicleGroupController {
  constructor(private readonly vehicleGroupService: SuperAdminFleetVehicleGroupService) {}

  @Get(':fleetId')
  async getAllVehicleGroupsByFleet(@Param('fleetId', ParseIntPipe) fleetId: number) {
    return this.vehicleGroupService.getAllVehicleGroupsByFleet(fleetId);
  }

  @Get('detail/:groupId')
  async getGroupDetailById(@Param('groupId', ParseIntPipe) groupId: number) {
    return this.vehicleGroupService.getGroupDetailById(groupId);
  }
}
