import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { AdminAuthGuard, ClientFeaturesGuard, ClientFeatureRequired, StaffPermissionsGuard, StaffPermission } from '@modules/auth';
import { AdminFleetVehicleGroupService } from '../services/admin-fleet-vehicle-group.service';
import { CreateFleetVehicleGroupDto, UpdateFleetVehicleGroupDto } from '../dto/admin-fleet-vehicle-group.dto';

/** Mirrors `routes/admin/fleet/vehicleGroupRoutes.js` + `controllers/admin/fleet/vehiclegroupContoller.js`. */
@Controller('v1/admin/fleet/group')
@UseGuards(AdminAuthGuard, ClientFeaturesGuard, StaffPermissionsGuard)
@ClientFeatureRequired('Fleet Module')
export class AdminFleetVehicleGroupController {
  constructor(private readonly groupService: AdminFleetVehicleGroupService) {}

  private clientId(req: any): number {
    return Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 0);
  }

  @Get(':fleetId')
  async getAllFleetVehicleGroups(@Req() req: any, @Param('fleetId', ParseIntPipe) fleetId: number) {
    return this.groupService.getAllFleetVehicleGroups(fleetId, this.clientId(req));
  }

  @Post()
  @StaffPermission('Fleet_Manage')
  async createFleetVehicleGroup(@Req() req: any, @Body() dto: CreateFleetVehicleGroupDto) {
    const staffId = req.user?.id || req.user?.sub;
    return this.groupService.createFleetVehicleGroup(this.clientId(req), staffId, dto);
  }

  @Put(':groupId')
  @StaffPermission('Fleet_Manage')
  async updateFleetVehicleGroup(@Req() req: any, @Param('groupId', ParseIntPipe) groupId: number, @Body() dto: UpdateFleetVehicleGroupDto) {
    return this.groupService.updateFleetVehicleGroup(groupId, this.clientId(req), dto);
  }

  @Delete(':groupId')
  @StaffPermission('Fleet_Manage')
  async deleteFleetVehicleGroup(@Req() req: any, @Param('groupId', ParseIntPipe) groupId: number) {
    return this.groupService.deleteFleetVehicleGroup(groupId, this.clientId(req));
  }
}
