import { Controller, Get, Post, Put, Delete, Param, Body, Query, Req, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AdminRfidTagService } from '../services/admin-rfid-tag.service';
import { AdminAuthGuard, StaffPermissionsGuard, StaffPermission, ClientFeaturesGuard, ClientFeatureRequired } from '@modules/auth';
import { CreateRfidTagDto, UpdateRfidTagDto, RfidTagQueryDto } from '../dto/admin-rfid-tag.dto';

@Controller('v1/admin/rfid-tag')
@UseGuards(AdminAuthGuard, ClientFeaturesGuard, StaffPermissionsGuard)
@ClientFeatureRequired('RFID Management')
export class AdminRfidTagController {
  constructor(private readonly adminRfidTagService: AdminRfidTagService) {}

  private clientId(req: any): number {
    return Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 0);
  }

  @Get()
  @StaffPermission('RFID_View')
  async getAllRfidTags(@Req() req: any, @Query() query: RfidTagQueryDto) {
    return this.adminRfidTagService.getAllRfidTags(this.clientId(req), query);
  }

  @Post()
  async createRfidTag(@Req() req: any, @Body() dto: CreateRfidTagDto) {
    const staffId = Number(req.user?.id || 0);
    return this.adminRfidTagService.createRfidTag(this.clientId(req), staffId, dto);
  }

  @Put(':id')
  async updateRfidTag(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRfidTagDto) {
    return this.adminRfidTagService.updateRfidTag(id, this.clientId(req), dto);
  }

  @Delete(':id')
  async deleteRfidTag(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.adminRfidTagService.deleteRfidTag(id, this.clientId(req));
  }

  @Get(':id')
  async getRfidTagById(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.adminRfidTagService.getRfidTagById(id, this.clientId(req));
  }
}
