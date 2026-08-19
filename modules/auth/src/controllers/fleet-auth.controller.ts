import { Controller, Post, Get, Put, Body, HttpCode, HttpStatus, UseGuards, Req, Param, ParseIntPipe } from '@nestjs/common';
import { FleetAuthService } from '../services/fleet-auth.service';
import { FleetAuthGuard } from '../guards/actor.guards';

/** Mirrors `routes/Fleet/authRoutes.js`. */
@Controller('v1/fleet/auth')
export class FleetAuthController {
  constructor(private readonly fleetAuthService: FleetAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Req() req: any, @Body() body: any) {
    return this.fleetAuthService.login(body, req.client?.clientId);
  }

  @Get('logout')
  @HttpCode(HttpStatus.OK)
  async logout() {
    // Legacy `logOutFleet` is a pure no-op (no auth guard, no token invalidation) — preserved as-is.
    return this.fleetAuthService.logout();
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body('fleetRefreshToken') refreshToken: string) {
    return this.fleetAuthService.refreshToken(refreshToken);
  }

  @Get('user-by-token')
  @UseGuards(FleetAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getUserByToken(@Req() req: any) {
    return this.fleetAuthService.getUserByToken(req.user.id || req.user.sub, req.user.clientId);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body('email') email: string, @Body('clientId') clientId: number) {
    return this.fleetAuthService.forgotPassword(email, Number(clientId));
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body('token') token: string, @Body('password') password: string) {
    return this.fleetAuthService.resetPassword(token, password);
  }

  @Put('update-profile/:id')
  @UseGuards(FleetAuthGuard)
  @HttpCode(HttpStatus.OK)
  async editProfile(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body('name') name?: string, @Body('phone') phone?: string) {
    return this.fleetAuthService.editProfile(id, req.user.clientId, name, phone);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body('otp') otp: any) {
    return this.fleetAuthService.verifyOtp(otp);
  }
}
