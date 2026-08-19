import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { FleetAuthGuard } from '@modules/auth';
import { FleetAssignedDriverService } from '../services/fleet-assigned-driver.service';
import { AssignDriverToVehicleDto } from '../dto/fleet-assigned-driver.dto';

/** Mirrors `routes/Fleet/vehicleDriverRoute.js`. */
@Controller('v1/fleet/assigned-driver')
@UseGuards(FleetAuthGuard)
export class FleetAssignedDriverController {
  constructor(private readonly assignedDriverService: FleetAssignedDriverService) {}

  private fleetId(req: any): number {
    return Number(req.user.fleetId);
  }

  private clientId(req: any): number {
    return Number(req.user.clientId);
  }

  @Post()
  async assignDriverToVehicle(@Req() req: any, @Body() dto: AssignDriverToVehicleDto) {
    return this.assignedDriverService.assignDriverToVehicle(this.fleetId(req), this.clientId(req), dto);
  }

  @Put(':assignmentId')
  async closeAssignedVehicle(@Req() req: any, @Param('assignmentId', ParseIntPipe) assignmentId: number) {
    return this.assignedDriverService.closeAssignedVehicle(assignmentId, this.clientId(req));
  }

  @Get(':vehicleId/all')
  async driverAssignedAllHistory(@Req() req: any, @Param('vehicleId', ParseIntPipe) vehicleId: number, @Query('status') status?: string) {
    return this.assignedDriverService.driverAssignedAllHistory(vehicleId, this.clientId(req), status);
  }

  @Get('session/:vehicleId/all')
  async vehicleDeviceTransactionHistory(@Param('vehicleId', ParseIntPipe) vehicleId: number) {
    return this.assignedDriverService.vehicleDeviceTransactionHistory(vehicleId);
  }
}
