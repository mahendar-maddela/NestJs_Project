import { Body, Controller, Get, Post, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { UserAuthService } from '../services/user-auth.service';
import {
  RefreshTokenDto,
  UserLoginByContactDto,
  UserLoginWithPasswordDto,
  UserRegisterVerifyOtpDto,
  UserResendOtpDto,
  UserSignUpDto,
  UserTenantLoginDto,
  UserTenantVerifyOtpDto,
} from '../dto/auth.dto';
import { UserAuthGuard } from '../guards/actor.guards';

function currentClientId(req: any): number {
  // Mirrors legacy `userAuthController.js` — the tenant comes from the verified `x-client-token`
  // (`req.client.clientId`), never from a client-supplied header.
  return Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 1);
}

/** Driver web-portal auth. Mirrors legacy `src/routes/Web/authRoutes.js` (`/v1/web/auth/*`). */
@Controller('v1/web/auth')
export class WebAuthController {
  constructor(private readonly userAuthService: UserAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: UserLoginByContactDto) {
    return this.userAuthService.requestOtpLogin(dto);
  }

  @Post('sign-up')
  @HttpCode(HttpStatus.OK)
  async signUp(@Req() req: any, @Body() dto: UserSignUpDto) {
    return this.userAuthService.signUp(dto, currentClientId(req));
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() dto: UserRegisterVerifyOtpDto) {
    return this.userAuthService.registerVerifyOtp(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.userAuthService.refreshToken(dto.refreshToken);
  }

  @Get('user-by-token')
  @UseGuards(UserAuthGuard)
  @HttpCode(HttpStatus.OK)
  async userByToken(@Req() req: any) {
    return this.userAuthService.getUserByToken(req.user.id);
  }

  @Get('logout')
  @UseGuards(UserAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: any) {
    return this.userAuthService.logout(req.user?.id);
  }

  @Post('login-with-password')
  @HttpCode(HttpStatus.OK)
  async loginWithPassword(@Body() dto: UserLoginWithPasswordDto) {
    return this.userAuthService.loginWithPassword(dto);
  }

  @Get('resend-otp')
  @HttpCode(HttpStatus.OK)
  async resendOtp(@Body() dto: UserResendOtpDto) {
    return this.userAuthService.resendOtp(dto);
  }

  @Post('app/login')
  @HttpCode(HttpStatus.OK)
  async appLogin(@Req() req: any, @Body() dto: UserTenantLoginDto) {
    return this.userAuthService.tenantLogin(dto, currentClientId(req));
  }

  @Post('app/verify')
  @HttpCode(HttpStatus.OK)
  async appVerify(@Req() req: any, @Body() dto: UserTenantVerifyOtpDto) {
    return this.userAuthService.tenantVerifyOtp(dto, currentClientId(req));
  }
}
