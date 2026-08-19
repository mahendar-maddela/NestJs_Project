import { Body, Controller, Get, Param, Put, Query, Req, UseGuards } from '@nestjs/common';
import { VendorAuthGuard } from '@modules/auth';
import { VendorUserService } from '../services/vendor-user.service';

/** Mirrors `routes/vendor/userRouter.js` + `controllers/vendors/userController.js`. */
@Controller('v1/vendor/user')
@UseGuards(VendorAuthGuard)
export class VendorUserController {
  constructor(private readonly userService: VendorUserService) {}

  private vendorId(req: any): number {
    return Number(req.vendor?.vendorId || req.user?.id || 0);
  }

  private clientId(req: any): number {
    return Number(req.vendor?.clientId || req.user?.clientId || req.headers['x-client-id'] || 0);
  }

  @Get()
  async getVendorUsers(@Req() req: any, @Query('search') search?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.userService.getVendorUsers(this.vendorId(req), search, Number(page) || 1, Number(limit) || 200);
  }

  @Get('transaction/:id')
  async getUserDeviceTransactions(@Req() req: any, @Param('id') id: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.userService.getUserDeviceTransactions(id, this.vendorId(req), Number(page) || 1, Number(limit) || 200);
  }

  @Get('credit-transaction/:id')
  async getUserCreditTransactions(@Req() req: any, @Param('id') id: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.userService.getUserCreditTransactions(id, this.vendorId(req), Number(page) || 1, Number(limit) || 200);
  }

  @Get('user-type/:id')
  async getUserTypeById(@Req() req: any, @Param('id') id: string) {
    return this.userService.getUserTypeById(id, this.vendorId(req));
  }

  @Put('status-update/:id')
  async vendorUserStatusUpdate(@Req() req: any, @Param('id') id: string, @Body('status') status: string) {
    return this.userService.vendorUserStatusUpdate(id, this.vendorId(req), status);
  }

  @Get('all-users')
  async getAllUserForDropdown(@Req() req: any, @Query('userId') userId?: string) {
    return this.userService.getAllUserForDropdown(this.clientId(req), userId);
  }

  @Get('rfids/:id')
  async getUserRfidTags(@Req() req: any, @Param('id') id: string) {
    return this.userService.getUserRfidTags(Number(id), this.vendorId(req));
  }
}
