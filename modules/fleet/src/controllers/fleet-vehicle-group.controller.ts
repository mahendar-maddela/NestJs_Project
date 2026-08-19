import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { FleetAuthGuard } from '@modules/auth';
import { FleetVehicleGroupService } from '../services/fleet-vehicle-group.service';
import { CreateFleetVehicleGroupDto, UpdateFleetVehicleGroupDto } from '../dto/fleet-vehicle-group.dto';

/** Mirrors `routes/Fleet/vehicleGroupRoutes.js`. */
@Controller('v1/fleet/group')
@UseGuards(FleetAuthGuard)
export class FleetVehicleGroupController {
  constructor(private readonly groupService: FleetVehicleGroupService) {}

  private fleetId(req: any): number {
    return Number(req.user.fleetId);
  }

  private clientId(req: any): number {
    return Number(req.user.clientId);
  }

  @Get()
  async getAllFleetVehicleGroups(@Req() req: any, @Query('page') page?: string, @Query('limit') limit?: string, @Query('search') search?: string) {
    return this.groupService.getAllFleetVehicleGroups(this.fleetId(req), this.clientId(req), Number(page) || 1, Number(limit) || 10, search);
  }

  @Post()
  async createFleetVehicleGroup(@Req() req: any, @Body() dto: CreateFleetVehicleGroupDto) {
    return this.groupService.createFleetVehicleGroup(this.fleetId(req), this.clientId(req), dto);
  }

  @Put(':groupId')
  async updateFleetVehicleGroup(@Req() req: any, @Param('groupId', ParseIntPipe) groupId: number, @Body() dto: UpdateFleetVehicleGroupDto) {
    return this.groupService.updateFleetVehicleGroup(groupId, this.fleetId(req), this.clientId(req), dto);
  }

  @Delete(':groupId')
  async deleteFleetVehicleGroup(@Req() req: any, @Param('groupId', ParseIntPipe) groupId: number) {
    return this.groupService.deleteFleetVehicleGroup(groupId, this.fleetId(req), this.clientId(req));
  }

  @Get(':groupId/vehicles')
  async groupIdByVehicle(@Req() req: any, @Param('groupId', ParseIntPipe) groupId: number) {
    return this.groupService.groupIdByVehicle(groupId, this.fleetId(req), this.clientId(req));
  }

  @Get(':id')
  async groupById(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.groupService.groupById(id, this.fleetId(req), this.clientId(req));
  }
}
