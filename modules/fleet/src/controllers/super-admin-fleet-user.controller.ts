import { Body, Controller, Get, Param, ParseIntPipe, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { SuperAdminAuthGuard } from '@modules/auth';
import { SuperAdminFleetUserService } from '../services/super-admin-fleet-user.service';
import { SuperAdminFleetUserStatusUpdateDto } from '../dto/super-admin-fleet.dto';

/** Mirrors `routes/SuperAdmin/fleet/fleetUserRoutes.js`. */
@Controller('v1/super-admin/fleet/user')
@UseGuards(SuperAdminAuthGuard)
export class SuperAdminFleetUserController {
  constructor(private readonly fleetUserService: SuperAdminFleetUserService) {}

  private superAdminId(req: any): number {
    return Number(req.user?.sub || req.user?.id || 0);
  }

  @Get()
  async getAllClientFleetUsers(@Query('clientId') clientId?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.fleetUserService.getAllClientFleetUsers(clientId ? Number(clientId) : undefined, Number(page) || 1, Number(limit) || 10);
  }

  @Get(':fleetUserId')
  async getFleetUserById(@Param('fleetUserId', ParseIntPipe) fleetUserId: number) {
    return this.fleetUserService.getFleetUserById(fleetUserId);
  }

  @Patch('status/:fleetUserId')
  async updateFleetUserStatus(@Req() req: any, @Param('fleetUserId', ParseIntPipe) fleetUserId: number, @Body() dto: SuperAdminFleetUserStatusUpdateDto) {
    return this.fleetUserService.updateFleetUserStatus(fleetUserId, this.superAdminId(req), dto);
  }
}
