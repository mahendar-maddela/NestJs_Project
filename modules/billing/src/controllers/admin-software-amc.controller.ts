import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AdminAuthGuard, StaffPermissionsGuard, StaffPermission } from '@modules/auth';
import { AdminSoftwareAmcService } from '../services/admin-software-amc.service';

/** Mirrors `routes/admin/softwareAmcRoutes.js` + `controllers/admin/softwareAMCcontroller.js`. */
@Controller('v1/admin/software-amc')
@UseGuards(AdminAuthGuard, StaffPermissionsGuard)
@StaffPermission('Software_Management')
export class AdminSoftwareAmcController {
  constructor(private readonly softwareAmcService: AdminSoftwareAmcService) {}

  private clientId(req: any): number {
    return Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 0);
  }

  @Get()
  async getChargersAccordingToStatus(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.softwareAmcService.getChargersAccordingToStatus(this.clientId(req), status, Number(page) || 1, Number(limit) || 200);
  }

  @Get('card')
  async getStackData(@Req() req: any) {
    return this.softwareAmcService.getStackData(this.clientId(req));
  }
}
