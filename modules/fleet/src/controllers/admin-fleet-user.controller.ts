import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AdminAuthGuard, ClientFeaturesGuard, ClientFeatureRequired, StaffPermissionsGuard, StaffPermission } from '@modules/auth';
import { AdminFleetUserService } from '../services/admin-fleet-user.service';
import { CreateFleetUserDto, UpdateFleetUserDto, FleetBlockUnblockDto } from '../dto/admin-fleet-user.dto';

/** Mirrors `routes/admin/fleet/fleetUserRoutes.js` + `controllers/admin/fleet/fleetUserController.js`. */
@Controller('v1/admin/fleet/user')
@UseGuards(AdminAuthGuard, ClientFeaturesGuard, StaffPermissionsGuard)
@ClientFeatureRequired('Fleet Module')
export class AdminFleetUserController {
  constructor(private readonly fleetUserService: AdminFleetUserService) {}

  private clientId(req: any): number {
    return Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 0);
  }

  @Get()
  @StaffPermission('Fleet_View')
  async getAllFleetUsers(@Req() req: any, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.fleetUserService.getAllFleetUsers(this.clientId(req), Number(page) || 1, Number(limit) || 10);
  }

  @Get('all')
  @StaffPermission('Fleet_View')
  async getFleetUsersAll(@Req() req: any) {
    return this.fleetUserService.getFleetUsersAll(this.clientId(req));
  }

  @Get(':fleetUserId')
  @StaffPermission('Fleet_View')
  async getFleetUserDetailsById(@Req() req: any, @Param('fleetUserId', ParseIntPipe) fleetUserId: number) {
    return this.fleetUserService.getFleetUserDetailsById(fleetUserId, this.clientId(req));
  }

  @Post()
  @StaffPermission('Fleet_Onboard')
  async createFleetUser(@Req() req: any, @Body() dto: CreateFleetUserDto) {
    const staffId = req.user?.id || req.user?.sub;
    return this.fleetUserService.createFleetUser(this.clientId(req), staffId, dto);
  }

  @Put(':fleetUserId')
  @StaffPermission('Fleet_Edit')
  async updateFleetUser(@Req() req: any, @Param('fleetUserId', ParseIntPipe) fleetUserId: number, @Body() dto: UpdateFleetUserDto) {
    const staffId = req.user?.id || req.user?.sub;
    return this.fleetUserService.updateFleetUser(fleetUserId, this.clientId(req), staffId, dto);
  }

  @Patch('status/:fleetDetailId')
  @StaffPermission('Fleet_Edit')
  async fleetBlockAndUnblock(@Req() req: any, @Param('fleetDetailId', ParseIntPipe) fleetDetailId: number, @Body() dto: FleetBlockUnblockDto) {
    return this.fleetUserService.fleetBlockAndUnblock(fleetDetailId, this.clientId(req), dto);
  }
}
