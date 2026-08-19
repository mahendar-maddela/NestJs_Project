import { Controller, Get, Post, Put, Delete, Param, Body, Query, Req, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AdminStaffService } from '../services/admin-staff.service';
import { AdminAuthGuard, StaffPermissionsGuard, StaffPermission } from '@modules/auth';
import { CreateStaffDto, UpdateStaffDto, StaffQueryDto } from '../dto/admin-staff.dto';

@Controller('v1/admin/staff')
@UseGuards(AdminAuthGuard, StaffPermissionsGuard)
export class AdminStaffController {
  constructor(private readonly adminStaffService: AdminStaffService) {}

  private clientId(req: any): number {
    return Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 0);
  }

  @Post()
  @StaffPermission('Team_Management')
  async createStaff(@Req() req: any, @Body() dto: CreateStaffDto) {
    return this.adminStaffService.createStaff(this.clientId(req), dto);
  }

  @Get()
  @StaffPermission('Team_Management')
  async getAllStaff(@Req() req: any, @Query() query: StaffQueryDto) {
    return this.adminStaffService.getAllStaff(this.clientId(req), query);
  }

  @Get(':id')
  @StaffPermission('Team_Management')
  async getStaffById(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.adminStaffService.getStaffById(id, this.clientId(req));
  }

  @Put(':id')
  @StaffPermission('Team_Management')
  async updateStaff(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStaffDto) {
    return this.adminStaffService.updateStaff(id, this.clientId(req), dto);
  }

  @Delete(':id')
  @StaffPermission('Team_Management')
  async deleteStaff(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.adminStaffService.deleteStaff(id, this.clientId(req));
  }
}
