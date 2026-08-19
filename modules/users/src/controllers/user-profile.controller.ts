import { Body, Controller, Get, Put, Post, Req, UseGuards } from '@nestjs/common';
import { UserProfileService } from '../services/user-profile.service';
import { UserAuthGuard } from '@modules/auth';
import { SendContactUpdateOtpDto, UpdateUserProfileDto, VerifyContactUpdateOtpDto } from '../dto/user-profile.dto';

function currentClientId(req: any): number {
  return Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 1);
}

/**
 * Driver profile. Mirrors legacy `controllers/Web/profileController.js`, mounted
 * identically at `v1/profile` (app) and `v1/web/profile` (web).
 */
@Controller(['v1/profile', 'v1/web/profile'])
@UseGuards(UserAuthGuard)
export class UserProfileController {
  constructor(private readonly profileService: UserProfileService) {}

  @Get()
  async getProfile(@Req() req: any) {
    return this.profileService.getProfile(req.user.id, currentClientId(req));
  }

  @Put()
  async updateProfile(@Req() req: any, @Body() dto: UpdateUserProfileDto) {
    return this.profileService.updateProfile(req.user.id, currentClientId(req), dto);
  }

  @Post('send-otp')
  async sendOtp(@Req() req: any, @Body() dto: SendContactUpdateOtpDto) {
    return this.profileService.sendContactUpdateOtp(req.user.id, currentClientId(req), dto.contact);
  }

  @Post('verify-otp')
  async verifyOtp(@Req() req: any, @Body() dto: VerifyContactUpdateOtpDto) {
    return this.profileService.verifyContactUpdateOtp(req.user.id, currentClientId(req), dto.otp);
  }
}
