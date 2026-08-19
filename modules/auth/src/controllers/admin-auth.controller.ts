import { Controller, Post, Get, Put, Body, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { AdminAuthService } from '../services/admin-auth.service';
import { AdminAuthGuard } from '../guards/actor.guards';

@Controller('v1/admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: any, @Req() req: any) {
    const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'Unknown';
    return this.adminAuthService.login(body, req.headers, String(ipAddress), req.client?.clientId);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body('otp') otp: any) {
    return this.adminAuthService.verifyOtp(otp);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body('refreshToken') refreshToken: string) {
    return this.adminAuthService.refreshToken(refreshToken);
  }

  @Put('staff-password')
  @UseGuards(AdminAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateStaffPassword(@Req() req: any, @Body('password') password: string) {
    return this.adminAuthService.updatePassword(req.user.id || req.user.sub, password);
  }

  @Get('logout')
  @UseGuards(AdminAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: any) {
    return this.adminAuthService.logout(req.user.id || req.user.sub);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body('email') email: string) {
    return this.adminAuthService.forgotPassword(email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body('token') token: string, @Body('password') password: string) {
    return this.adminAuthService.resetPassword(token, password);
  }

  @Get('profile')
  @UseGuards(AdminAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getProfile(@Req() req: any) {
    return this.adminAuthService.getProfile(req.user.id || req.user.sub);
  }

  @Get('userByToken')
  @UseGuards(AdminAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getUserByToken(@Req() req: any) {
    return this.adminAuthService.getUserByToken(req.user.id || req.user.sub);
  }
}
