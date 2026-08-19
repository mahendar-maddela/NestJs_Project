import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { SuperAdminAuthGuard } from '@modules/auth';
import { SuperAdminFleetRfidService } from '../services/super-admin-fleet-rfid.service';

/** Mirrors `routes/SuperAdmin/fleet/rfidRoutes.js`. */
@Controller('v1/super-admin/fleet/rfid-tag')
@UseGuards(SuperAdminAuthGuard)
export class SuperAdminFleetRfidController {
  constructor(private readonly rfidService: SuperAdminFleetRfidService) {}

  @Get(':groupId')
  async getRFIDsByGroupId(@Param('groupId') groupId: string) {
    return this.rfidService.getRFIDsByGroupId(groupId);
  }
}
