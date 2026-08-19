import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { AdminAuthGuard, ClientFeaturesGuard, ClientFeatureRequired, StaffPermissionsGuard, StaffPermission } from '@modules/auth';
import { AdminFleetRfidService } from '../services/admin-fleet-rfid.service';
import { CreateFleetRfidTagDto, UpdateFleetRfidTagDto } from '../dto/admin-fleet-rfid.dto';

/** Mirrors `routes/admin/fleet/rfidRoutes.js` + `controllers/admin/fleet/rfidController.js`. */
@Controller('v1/admin/fleet/rfid-tag')
@UseGuards(AdminAuthGuard, ClientFeaturesGuard, StaffPermissionsGuard)
@ClientFeatureRequired('Fleet Module')
export class AdminFleetRfidController {
  constructor(private readonly rfidService: AdminFleetRfidService) {}

  private clientId(req: any): number {
    return Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 0);
  }

  @Post()
  @StaffPermission('Fleet_Manage')
  async createRfidTag(@Req() req: any, @Body() dto: CreateFleetRfidTagDto) {
    const staffId = req.user?.id || req.user?.sub;
    return this.rfidService.createRfidTag(this.clientId(req), staffId, dto);
  }

  @Get('single/:rfId')
  @StaffPermission('Fleet_View')
  async getRfidTagById(@Req() req: any, @Param('rfId', ParseIntPipe) rfId: number) {
    return this.rfidService.getRfidTagById(rfId, this.clientId(req));
  }

  @Get(':groupId')
  @StaffPermission('Fleet_View')
  async getAllRfidsByFleetId(@Req() req: any, @Param('groupId', ParseIntPipe) groupId: number) {
    return this.rfidService.getAllRfidsByFleetId(groupId, this.clientId(req));
  }

  @Put(':rfId')
  @StaffPermission('Fleet_Manage')
  async updateRfidTag(@Req() req: any, @Param('rfId', ParseIntPipe) rfId: number, @Body() dto: UpdateFleetRfidTagDto) {
    return this.rfidService.updateRfidTag(rfId, this.clientId(req), dto);
  }

  @Delete(':rfid')
  @StaffPermission('Fleet_Manage')
  async deleteRfidTag(@Req() req: any, @Param('rfid', ParseIntPipe) rfid: number) {
    return this.rfidService.deleteRfidTag(rfid, this.clientId(req));
  }
}
