import { Controller, Post, Get, Body, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { VendorAuthService } from '../services/vendor-auth.service';
import { VendorAuthGuard } from '../guards/actor.guards';

@Controller('v1/vendor/auth')
export class VendorAuthController {
  constructor(private readonly vendorAuthService: VendorAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Req() req: any, @Body() body: any) {
    return this.vendorAuthService.login(body, req.client?.clientId);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body('otp') otp: any) {
    return this.vendorAuthService.verifyOtp(otp);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body('refreshToken') refreshToken: string) {
    return this.vendorAuthService.refreshToken(refreshToken);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body('email') email: string) {
    return this.vendorAuthService.forgotPassword(email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Req() req: any, @Body('email') email: string) {
    const clientId = Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 1);
    return this.vendorAuthService.resetPasswordWithMail(email, clientId);
  }

  @Post('verify-reset-password')
  @HttpCode(HttpStatus.OK)
  async verifyResetPassword(@Body('otp') otp: string) {
    return this.vendorAuthService.verifyOtpResetPassword(otp);
  }

  @Post('updated-password')
  @HttpCode(HttpStatus.OK)
  async updatedPassword(@Body('token') token: string, @Body('password') password: string) {
    return this.vendorAuthService.resetPassword(token, password);
  }

  @Post('reset-forgot-password')
  @HttpCode(HttpStatus.OK)
  async resetForgotPassword(@Body('token') token: string, @Body('password') password: string) {
    return this.vendorAuthService.resetPassword(token, password);
  }

  @Get('bank-details')
  @UseGuards(VendorAuthGuard)
  @HttpCode(HttpStatus.OK)
  async bankDetails(@Req() req: any) {
    return this.vendorAuthService.getVendorBankDetails(req.user.id);
  }

  @Get('logout')
  @UseGuards(VendorAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: any) {
    return this.vendorAuthService.logout(req.user.id);
  }

  // Legacy route was `vendorByToken`; both spellings are registered so existing clients keep working.
  @Get(['userByToken', 'vendorByToken'])
  @UseGuards(VendorAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getVendorByToken(@Req() req: any) {
    return this.vendorAuthService.getVendorByToken(req.user.id);
  }
}
