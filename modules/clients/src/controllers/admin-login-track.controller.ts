import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AdminLoginTrackService } from '../services/admin-login-track.service';
import { AdminAuthGuard, StaffPermissionsGuard, StaffPermission } from '@modules/auth';

@Controller('v1/admin/login-track')
@UseGuards(AdminAuthGuard, StaffPermissionsGuard)
export class AdminLoginTrackController {
  constructor(private readonly adminLoginTrackService: AdminLoginTrackService) {}

  @Get()
  @StaffPermission('Team_Login_History_View')
  async getLoginTracks(@Req() req: any, @Query('page') page?: string, @Query('limit') limit?: string) {
    const clientId = Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 0);
    return this.adminLoginTrackService.getLoginTracks(clientId, Number(page) || 1, Number(limit) || 200);
  }
}
