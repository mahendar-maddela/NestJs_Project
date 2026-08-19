import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { RoleService } from '../services/role.service';
import { CreateRoleDto, UpdateRoleDto, RoleQueryDto } from '../dto/role.dto';
import { SuperAdminAuthGuard } from '@modules/auth';

@Controller('v1/super-admin/role')
@UseGuards(SuperAdminAuthGuard)
export class SuperAdminRoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  async createRole(@Body() body: CreateRoleDto, @Req() req: any) {
    const superAdminId = req.user?.sub || req.user?.id;
    return this.roleService.createRole(body, superAdminId);
  }

  @Get()
  async getAllRoles(@Query() query: RoleQueryDto, @Req() req: any) {
    const superAdminId = req.user?.sub || req.user?.id;
    return this.roleService.getAllRoles(query, superAdminId);
  }

  @Get('permissions')
  async getAllSuperPermission() {
    return this.roleService.getAllSuperPermission();
  }

  @Get(':id')
  async getRoleById(@Param('id', ParseIntPipe) id: number) {
    return this.roleService.getRoleById(id);
  }

  @Put(':id')
  async updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateRoleDto,
    @Req() req: any,
  ) {
    const superAdminId = req.user?.sub || req.user?.id;
    return this.roleService.updateRole(id, body, superAdminId);
  }

  @Delete(':id')
  async deleteRole(@Param('id', ParseIntPipe) id: number) {
    return this.roleService.deleteRole(id);
  }
}
