import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { SuperAdminAuthGuard } from '@modules/auth';
import { SuperAdminUserService } from '../services/super-admin-user.service';
import { SuperAdminUserQueryDto, UpdateAutoChargeDto, UpdateUserStatusDto } from '../dto/super-admin-user.dto';

/** Mirrors `routes/SuperAdmin/userRoutes.js` + `controllers/suparAdmin/userController.js`. */
@Controller('v1/super-admin/users')
@UseGuards(SuperAdminAuthGuard)
export class SuperAdminUserController {
  constructor(private readonly userService: SuperAdminUserService) {}

  private superAdminId(req: any): number {
    return Number(req.user?.sub || req.user?.id || 0);
  }

  @Get()
  async getAllClientsUsers(@Query() query: SuperAdminUserQueryDto) {
    return this.userService.getAllClientsUsers(query);
  }

  @Get('payment/:userId')
  async getUserPaymentsById(@Param('userId', ParseIntPipe) userId: number, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.userService.getUserPaymentsById(userId, Number(page) || 1, Number(limit) || 200);
  }

  @Get('wallet-transaction/:userId')
  async getWalletTransactionsById(@Param('userId', ParseIntPipe) userId: number, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.userService.getWalletTransactionsById(userId, Number(page) || 1, Number(limit) || 200);
  }

  @Get('charging-sessions/:userId')
  async getChargingSessionById(@Param('userId', ParseIntPipe) userId: number, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.userService.getChargingSessionById(userId, Number(page) || 1, Number(limit) || 200);
  }

  @Get('rfid/:userId')
  async getRfidTagsByUserId(@Param('userId', ParseIntPipe) userId: number, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.userService.getRfidTagsByUserId(userId, Number(page) || 1, Number(limit) || 200);
  }

  @Get('vehicle/:userId')
  async getUserVehicleById(@Param('userId', ParseIntPipe) userId: number, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.userService.getUserVehicleById(userId, Number(page) || 1, Number(limit) || 200);
  }

  @Get('cpo/:userId')
  async getCposByUserId(@Param('userId', ParseIntPipe) userId: number, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.userService.getCposByUserId(userId, Number(page) || 1, Number(limit) || 200);
  }

  @Post('vehicle/enable-autocharge/:vehicleId')
  async updateAutoChargeOfVehicle(@Param('vehicleId', ParseIntPipe) vehicleId: number, @Body() dto: UpdateAutoChargeDto) {
    return this.userService.updateAutoChargeOfVehicle(vehicleId, dto);
  }

  @Get(':userId')
  async getClientUserById(@Param('userId', ParseIntPipe) userId: number) {
    return this.userService.getClientUserById(userId);
  }

  @Patch(':userId')
  async updateUserStatus(@Req() req: any, @Param('userId', ParseIntPipe) userId: number, @Body() dto: UpdateUserStatusDto) {
    return this.userService.updateUserStatus(userId, this.superAdminId(req), dto);
  }
}
