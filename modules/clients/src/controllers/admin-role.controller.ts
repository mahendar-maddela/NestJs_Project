import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { AdminRoleService } from '../services/admin-role.service';
import { AdminAuthGuard } from '@modules/auth';

@Controller('v1/admin/role')
@UseGuards(AdminAuthGuard)
export class AdminRoleController {
  constructor(private readonly adminRoleService: AdminRoleService) {}

  @Post()
  async createRole(@Req() req: any, @Body() body: any) {
    const staffId = req.user?.id || req.user?.sub;
    const clientId = Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 1);
    return this.adminRoleService.createRole(body, staffId, clientId);
  }

  @Get()
  async getAllRoles(@Req() req: any) {
    const clientId = Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 1);
    return this.adminRoleService.getAllRoles(clientId);
  }

  @Get(':id')
  async getRoleById(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const clientId = Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 1);
    return this.adminRoleService.getRoleById(id, clientId);
  }

  @Put(':id')
  async updateRole(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() body: any) {
    const clientId = Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 1);
    return this.adminRoleService.updateRole(id, body, clientId);
  }

  @Delete(':id')
  async deleteRole(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const clientId = Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 1);
    return this.adminRoleService.deleteRole(id, clientId);
  }
}
