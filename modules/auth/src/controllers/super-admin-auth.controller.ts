import { Controller, Post, Get, Body, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { SuperAdminAuthService } from '../services/super-admin-auth.service';
import { LoginDto } from '../dto/auth.dto';
import { SuperAdminAuthGuard } from '../guards/actor.guards';

@Controller('v1/super-admin/auth')
export class SuperAdminAuthController {
  constructor(private readonly superAdminAuthService: SuperAdminAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.superAdminAuthService.login(dto);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body('otp') otp: any) {
    return this.superAdminAuthService.verifyOtp(otp);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body('email') email: string) {
    return this.superAdminAuthService.forgotPassword(email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body('token') token: string, @Body('password') password: string) {
    return this.superAdminAuthService.resetPassword(token, password);
  }

  @Get('userByToken')
  @UseGuards(SuperAdminAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getUserByToken(@Req() req: any) {
    return this.superAdminAuthService.getUserByToken(req.user.id);
  }

  @Post('logout')
  @UseGuards(SuperAdminAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: any) {
    return this.superAdminAuthService.logout(req.user.id);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body('refreshToken') refreshToken: string) {
    return this.superAdminAuthService.refreshToken(refreshToken);
  }
}
