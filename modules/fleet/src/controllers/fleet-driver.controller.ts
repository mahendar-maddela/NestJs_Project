import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { FleetAuthGuard } from '@modules/auth';
import { FleetDriverService } from '../services/fleet-driver.service';
import { CreateFleetDriverDto, UpdateFleetDriverDto } from '../dto/fleet-driver.dto';

/** Mirrors `routes/Fleet/driverRoutes.js`. */
@Controller('v1/fleet/driver')
@UseGuards(FleetAuthGuard)
export class FleetDriverController {
  constructor(private readonly driverService: FleetDriverService) {}

  private fleetId(req: any): number {
    return Number(req.user.fleetId);
  }

  private clientId(req: any): number {
    return Number(req.user.clientId);
  }

  @Get()
  async getAllDrivers(@Req() req: any, @Query('page') page?: string, @Query('limit') limit?: string, @Query('search') search?: string) {
    const pageNum = page ? Number(page) : undefined;
    const limitNum = limit ? Number(limit) : undefined;
    return this.driverService.getAllDrivers(this.fleetId(req), this.clientId(req), pageNum, limitNum, search);
  }

  @Get(':id')
  async getDriverById(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.driverService.getDriverById(id, this.clientId(req));
  }

  @Post()
  async createFleetDriver(@Req() req: any, @Body() dto: CreateFleetDriverDto) {
    return this.driverService.createFleetDriver(this.fleetId(req), this.clientId(req), dto);
  }

  @Put(':driverId')
  async updateFleetDriver(@Req() req: any, @Param('driverId', ParseIntPipe) driverId: number, @Body() dto: UpdateFleetDriverDto) {
    return this.driverService.updateFleetDriver(driverId, this.clientId(req), dto);
  }

  @Get('assigned-history/:id')
  async driverAssignedHistory(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.driverService.driverAssignedHistory(id, this.fleetId(req), this.clientId(req), Number(page) || 1, Number(limit) || 10);
  }

  @Get('charging-session-history/:id')
  async driverChargingSessionHistory(@Param('id', ParseIntPipe) id: number) {
    return this.driverService.driverChargingSessionHistory(id);
  }
}
