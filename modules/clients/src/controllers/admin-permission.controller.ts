import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { AdminPermissionService } from '../services/admin-permission.service';
import { AdminAuthGuard } from '@modules/auth';
import { CreatePermissionDto, UpdatePermissionDto } from '../dto/permission.dto';

@Controller('v1/admin/permission')
@UseGuards(AdminAuthGuard)
export class AdminPermissionController {
  constructor(private readonly adminPermissionService: AdminPermissionService) {}

  @Post()
  async createPermission(@Body() dto: CreatePermissionDto) {
    return this.adminPermissionService.createPermission(dto);
  }

  @Get()
  async getAllPermissions(@Req() req: any) {
    const clientId = Number(
      req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || req.query?.clientId || 0,
    );
    return this.adminPermissionService.getAllPermissions(clientId);
  }

  @Get(':id')
  async getPermissionById(@Param('id', ParseIntPipe) id: number) {
    return this.adminPermissionService.getPermissionById(id);
  }

  @Put(':id')
  async updatePermission(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePermissionDto) {
    return this.adminPermissionService.updatePermission(id, dto);
  }

  @Delete(':id')
  async deletePermission(@Param('id', ParseIntPipe) id: number) {
    return this.adminPermissionService.deletePermission(id);
  }
}
