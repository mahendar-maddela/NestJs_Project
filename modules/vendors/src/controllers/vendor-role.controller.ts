import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { VendorAuthGuard } from '@modules/auth';
import { VendorRoleService } from '../services/vendor-role.service';
import { CreateVendorRoleDto, UpdateVendorRoleDto } from '../dto/vendor-role.dto';

/** Mirrors `routes/vendor/roleRoutes.js` + `controllers/vendors/roleController.js`. */
@Controller('v1/vendor/role')
@UseGuards(VendorAuthGuard)
export class VendorRoleController {
  constructor(private readonly roleService: VendorRoleService) {}

  private vendorId(req: any): number {
    return Number(req.vendor?.vendorId || req.user?.id || 0);
  }

  private clientId(req: any): number {
    return Number(req.vendor?.clientId || req.user?.clientId || req.headers['x-client-id'] || 0);
  }

  @Post()
  async createRole(@Req() req: any, @Body() dto: CreateVendorRoleDto) {
    return this.roleService.createRole(this.vendorId(req), this.clientId(req), dto);
  }

  @Get()
  async getRoles(@Req() req: any) {
    return this.roleService.getRoles(this.vendorId(req));
  }

  @Get(':id')
  async getRoleById(@Param('id', ParseIntPipe) id: number) {
    return this.roleService.getRoleById(id);
  }

  @Put(':id')
  async updateRole(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateVendorRoleDto) {
    return this.roleService.updateRole(id, dto);
  }

  @Delete(':id')
  async deleteRole(@Param('id', ParseIntPipe) id: number) {
    return this.roleService.deleteRole(id);
  }
}
