import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { VendorAuthGuard } from '@modules/auth';
import { VendorDriverService } from '../services/vendor-driver.service';
import { CreateDriverDto, UpdateDriverDto } from '../dto/admin-driver.dto';

/** Mirrors `routes/vendor/fleet/driverRoutes.js` + `controllers/vendors/Fleet/driverController.js`. */
@Controller('v1/vendor/fleet/driver')
@UseGuards(VendorAuthGuard)
export class VendorDriverController {
  constructor(private readonly driverService: VendorDriverService) {}

  private clientId(req: any): number {
    return Number(req.vendor?.clientId || req.user?.clientId || req.headers['x-client-id'] || 0);
  }

  @Get('single/:driverId')
  async getFleetDriverById(@Req() req: any, @Param('driverId', ParseIntPipe) driverId: number) {
    return this.driverService.getFleetDriverById(driverId, this.clientId(req));
  }

  @Get(':fleetId')
  async getAllFleetDrivers(@Req() req: any, @Param('fleetId', ParseIntPipe) fleetId: number, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.driverService.getAllFleetDrivers(fleetId, this.clientId(req), Number(page) || 1, Number(limit) || 10);
  }

  @Post()
  async createFleetDriver(@Req() req: any, @Body() dto: CreateDriverDto) {
    return this.driverService.createFleetDriver(this.clientId(req), dto);
  }

  @Put(':driverId')
  async updateFleetDriver(@Req() req: any, @Param('driverId', ParseIntPipe) driverId: number, @Body() dto: UpdateDriverDto) {
    return this.driverService.updateFleetDriver(driverId, this.clientId(req), dto);
  }
}
