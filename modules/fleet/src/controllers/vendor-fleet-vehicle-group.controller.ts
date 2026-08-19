import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { VendorAuthGuard } from '@modules/auth';
import { VendorFleetVehicleGroupService } from '../services/vendor-fleet-vehicle-group.service';
import { CreateVendorFleetVehicleGroupDto, UpdateVendorFleetVehicleGroupDto } from '../dto/vendor-fleet-vehicle-group.dto';

/** Mirrors `routes/vendor/fleet/groupRouutes.js` + `controllers/vendors/Fleet/groupController.js`. */
@Controller('v1/vendor/fleet/group')
@UseGuards(VendorAuthGuard)
export class VendorFleetVehicleGroupController {
  constructor(private readonly groupService: VendorFleetVehicleGroupService) {}

  private vendorId(req: any): number {
    return Number(req.vendor?.vendorId || req.user?.id || 0);
  }

  private clientId(req: any): number {
    return Number(req.vendor?.clientId || req.user?.clientId || req.headers['x-client-id'] || 0);
  }

  @Get('single/:groupId')
  async getFleetGroupById(@Req() req: any, @Param('groupId', ParseIntPipe) groupId: number) {
    return this.groupService.getFleetGroupById(groupId, this.vendorId(req), this.clientId(req));
  }

  @Get(':fleetId')
  async getAllVehicleGroups(@Req() req: any, @Param('fleetId', ParseIntPipe) fleetId: number) {
    return this.groupService.getAllVehicleGroups(fleetId, this.vendorId(req));
  }

  @Post()
  async createFleetVehicleGroup(@Req() req: any, @Body() dto: CreateVendorFleetVehicleGroupDto) {
    return this.groupService.createFleetVehicleGroup(this.vendorId(req), this.clientId(req), dto);
  }

  @Put(':groupId')
  async updateFleetVehicleGroup(@Req() req: any, @Param('groupId', ParseIntPipe) groupId: number, @Body() dto: UpdateVendorFleetVehicleGroupDto) {
    return this.groupService.updateFleetVehicleGroup(groupId, this.clientId(req), dto);
  }

  @Delete(':groupId')
  async deleteFleetVehicleGroup(@Req() req: any, @Param('groupId', ParseIntPipe) groupId: number) {
    return this.groupService.deleteFleetVehicleGroup(groupId, this.vendorId(req));
  }
}
