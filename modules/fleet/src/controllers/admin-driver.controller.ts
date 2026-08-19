import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { AdminAuthGuard, ClientFeaturesGuard, ClientFeatureRequired, StaffPermissionsGuard, StaffPermission } from '@modules/auth';
import { AdminDriverService } from '../services/admin-driver.service';
import { CreateDriverDto, UpdateDriverDto } from '../dto/admin-driver.dto';

/** Mirrors `routes/admin/fleet/driverRoutes.js` + `controllers/admin/fleet/driverController.js`. */
@Controller('v1/admin/fleet/driver')
@UseGuards(AdminAuthGuard, ClientFeaturesGuard, StaffPermissionsGuard)
@ClientFeatureRequired('Fleet Module')
export class AdminDriverController {
  constructor(private readonly driverService: AdminDriverService) {}

  private clientId(req: any): number {
    return Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 0);
  }

  @Post()
  @StaffPermission('Fleet_Manage')
  async createDriver(@Req() req: any, @Body() dto: CreateDriverDto) {
    return this.driverService.createDriver(this.clientId(req), dto);
  }

  @Get(':fleetId')
  @StaffPermission('Fleet_View')
  async getAllDrivers(@Req() req: any, @Param('fleetId', ParseIntPipe) fleetId: number) {
    return this.driverService.getAllDrivers(fleetId, this.clientId(req));
  }

  @Put(':driverId')
  @StaffPermission('Fleet_Manage')
  async updateDriver(@Req() req: any, @Param('driverId', ParseIntPipe) driverId: number, @Body() dto: UpdateDriverDto) {
    return this.driverService.updateDriver(driverId, this.clientId(req), dto);
  }
}
