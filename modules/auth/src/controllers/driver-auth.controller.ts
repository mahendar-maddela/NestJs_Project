import { Body, Controller, Get, Post, Put, Req, UseGuards } from '@nestjs/common';
import { DriverAuthService } from '../services/driver-auth.service';
import { FleetAuthGuard } from '../guards/actor.guards';
import { DriverLoginDto, DriverResendOtpDto, DriverVerifyOtpDto, DriverUpdateProfileDto } from '../dto/driver-auth.dto';

function currentClientId(req: any): number {
  return Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 1);
}

/**
 * Mirrors `routes/app/fleet/driverauthRoutes.js`. In legacy this router is unreachable except for
 * routes with no path collision against the (earlier-registered) Fleet-manager router mounted at
 * the same `/v1/fleet` prefix — `POST /ocpp/stop` collides with the Fleet-manager's own
 * `/v1/fleet/ocpp/stop` and is dead code there, so it is intentionally not ported here.
 */
@Controller('v1/fleet')
export class DriverAuthController {
  constructor(private readonly driverAuthService: DriverAuthService) {}

  @Post('login')
  async driverLogin(@Req() req: any, @Body() dto: DriverLoginDto) {
    return this.driverAuthService.driverLogin(currentClientId(req), dto);
  }

  @Post('verify-otp')
  async registerVerifyOtp(@Req() req: any, @Body() dto: DriverVerifyOtpDto) {
    return this.driverAuthService.registerVerifyOtp(currentClientId(req), dto);
  }

  @Post('resend-otp')
  async resendOtp(@Req() req: any, @Body() dto: DriverResendOtpDto) {
    return this.driverAuthService.resendOtp(currentClientId(req), dto);
  }

  @Get('logout')
  @UseGuards(FleetAuthGuard)
  async driverLogout(@Req() req: any) {
    return this.driverAuthService.driverLogout(req.user.id);
  }

  @Get('get-by-token')
  @UseGuards(FleetAuthGuard)
  async getDriverByToken(@Req() req: any) {
    return this.driverAuthService.getDriverByToken(req.user.id, currentClientId(req));
  }

  @Put('update-profile')
  @UseGuards(FleetAuthGuard)
  async updateProfile(@Req() req: any, @Body() dto: DriverUpdateProfileDto) {
    return this.driverAuthService.updateProfile(req.user.id, currentClientId(req), dto);
  }
}
