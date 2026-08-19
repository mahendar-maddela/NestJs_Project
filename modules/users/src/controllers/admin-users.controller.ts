import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { AdminUserService } from '../services/admin-user.service';
import { AdminAuthGuard, StaffPermissionsGuard, StaffPermission } from '@modules/auth';

@Controller('v1/admin/user')
@UseGuards(AdminAuthGuard, StaffPermissionsGuard)
export class AdminUsersController {
  constructor(private readonly adminUserService: AdminUserService) {}

  @Get()
  @StaffPermission('User_View')
  async getAllUsers(@Req() req: any, @Query() query: any) {
    const clientId = Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 1);
    return this.adminUserService.getAllUsers(query, clientId);
  }

  @Get('device-transaction/:id')
  @StaffPermission('User_View')
  async getUserDeviceTransactions(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: any,
  ) {
    const clientId = Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 1);
    return this.adminUserService.getUserDeviceTransactions(id, query, clientId);
  }

  @Get('wallet-transaction/:id')
  @StaffPermission('User_View')
  async getUserWalletTransactions(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: any,
  ) {
    const clientId = Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 1);
    return this.adminUserService.getUserWalletTransactions(id, query, clientId);
  }

  @Get('rfid/:id')
  @StaffPermission('User_View')
  async getUserRfidTags(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: any,
  ) {
    const clientId = Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 1);
    return this.adminUserService.getUserRfidTags(id, query, clientId);
  }

  @Get('vendor/:id')
  @StaffPermission('User_View')
  async getUserVendor(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const clientId = Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 1);
    return this.adminUserService.getUserVendor(id, clientId);
  }

  @Get('payment/:id')
  @StaffPermission('User_View')
  async getUserPayments(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: any,
  ) {
    const clientId = Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 1);
    return this.adminUserService.getUserPayments(id, query, clientId);
  }

  @Get('vehicle/:id')
  @StaffPermission('User_View')
  async getUserVehiclesById(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const clientId = Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 1);
    return this.adminUserService.getUserVehiclesById(id, clientId);
  }

  @Put('vehicle/auto')
  @StaffPermission('User_View')
  async updateUserVehicleAutoCharge(@Req() req: any, @Body() body: any) {
    const clientId = Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 1);
    return this.adminUserService.updateUserVehicleAutoCharge(body, clientId);
  }

  @Post('credit')
  @StaffPermission('User_Manage_Wallet')
  async handleUserWalletBalance(@Req() req: any, @Body() body: any) {
    const staffId = req.user?.id || req.user?.sub;
    const clientId = Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 1);
    return this.adminUserService.handleUserWalletBalance(body, staffId, clientId);
  }

  @Get(':id')
  @StaffPermission('User_View')
  async getUserById(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const clientId = Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 1);
    return this.adminUserService.getUserById(id, clientId);
  }

  @Put(':id')
  @StaffPermission('User_View')
  async updateUser(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() body: any) {
    const clientId = Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 1);
    return this.adminUserService.updateUser(id, body, clientId);
  }

  @Delete(':id')
  @StaffPermission('User_View')
  async deleteUser(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const clientId = Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 1);
    return this.adminUserService.deleteUser(id, clientId);
  }

  @Patch(':id')
  @StaffPermission('User_View')
  async userStatusUpdate(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
  ) {
    const clientId = Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 1);
    return this.adminUserService.userStatusUpdate(id, status, clientId);
  }
}
