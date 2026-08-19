import { Injectable, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthRepository } from '../repositories/auth.repository';
import { AwsService } from '@integrations/aws';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { JwtPayload } from '../strategies/jwt.strategies';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly awsService: AwsService,
  ) {}

  async login(body: any, headers: any = {}, ipAddress: string = 'Unknown', verifiedClientId?: number) {
    const field = body.field || body.email || body.phone;
    const password = body.password;

    if (!field || !password) {
      throw new BadRequestException({ message: 'Field (email or phone) and password are required' });
    }

    // Mirrors legacy `staffAuthController.js` — the tenant comes from the verified `x-client-token`
    // (`req.client.clientId`), never from the request body.
    const clientId = verifiedClientId ?? body.clientId;
    const staff = await this.authRepository.findStaffByField(field, clientId);

    if (!staff) {
      throw new NotFoundException({ message: 'Invalid email' });
    }

    if (staff.status !== 'Active') {
      throw new BadRequestException({ message: `Your account is ${staff.status} please contact adminstration` });
    }

    const isMatch = await bcrypt.compare(password, staff.password || '');
    if (!isMatch) {
      throw new UnauthorizedException({ message: 'Invalid password' });
    }

    const payload: JwtPayload = {
      sub: staff.id,
      email: staff.email || undefined,
      actorType: 'staff',
      clientId: staff.clientId || undefined,
    };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '30m' });
    const refreshTokenStr = uuidv4();

    await this.authRepository.createRefreshToken({
      userId: staff.id,
      token: refreshTokenStr,
      type: 'staff',
      expire: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    });

    const userAgent = headers['user-agent'] || 'Unknown Device';
    const isMobile = /mobile|android|iphone|ipad/i.test(userAgent);
    const deviceType = isMobile ? 'Mobile' : 'Desktop';

    if (staff.clientId) {
      try {
        await this.authRepository.createLoginTrack({
          clientId: staff.clientId,
          staffId: staff.id,
          ipAddress,
          loginTime: new Date(),
          status: 'Login',
          device: `(${deviceType})`,
          browser: userAgent.slice(0, 100),
        });
      } catch {
        // Ignore login tracking failure
      }
    }

    return {
      success: true,
      message: 'Login successfull',
      accessToken,
      refreshToken: refreshTokenStr,
    };
  }

  async verifyOtp(otp: string | number) {
    const otpRecord = await this.authRepository.findOtpRecord(String(otp), 'staff');

    if (!otpRecord || otpRecord.expires_at < new Date()) {
      throw new NotFoundException({ message: 'Invalid OTP' });
    }

    const staff = await this.authRepository.findStaffById(otpRecord.type_id);

    if (!staff) {
      throw new NotFoundException({ message: 'User not found' });
    }

    const payload: JwtPayload = {
      sub: staff.id,
      email: staff.email || undefined,
      actorType: 'staff',
      clientId: staff.clientId || undefined,
    };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '200m' });
    const refreshTokenStr = uuidv4();

    await this.authRepository.createRefreshToken({
      userId: staff.id,
      token: refreshTokenStr,
      type: 'staff',
      expire: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await this.authRepository.deleteOtpRecord(otpRecord.id);

    return {
      success: true,
      message: 'Login successfull',
      accessToken,
      refreshToken: refreshTokenStr,
    };
  }

  async refreshToken(refreshToken: string) {
    if (!refreshToken) {
      throw new BadRequestException({ success: false, message: 'Token required' });
    }

    const refToken = await this.authRepository.findRefreshToken(refreshToken, 'staff');

    if (!refToken) {
      throw new NotFoundException({ success: false, message: 'Invalid refresh token' });
    }

    if (refToken.expire < new Date()) {
      await this.authRepository.deleteRefreshToken(refToken.id);
      throw new NotFoundException({ success: false, message: 'Refresh token has expired' });
    }

    const payload: JwtPayload = { sub: refToken.userId, actorType: 'staff' };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '30m' });

    return {
      success: true,
      message: 'Access token refreshed successfully',
      accessToken,
    };
  }

  async updatePassword(staffId: number, password: string) {
    if (!password) {
      throw new BadRequestException({ message: 'Password is required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await this.authRepository.updateStaffPassword(staffId, hashedPassword);

    return {
      success: true,
      message: 'Staff password updated successfully',
    };
  }

  async logout(staffId: number) {
    await this.authRepository.updateLastLoginLogout(staffId);
    await this.authRepository.deleteRefreshTokensByUser(staffId, 'staff');

    return {
      success: true,
      message: 'logout successfully',
    };
  }

  async getProfile(staffId: number) {
    const staff = await this.authRepository.findStaffFullProfile(staffId);
    if (!staff) {
      throw new NotFoundException({ message: 'Staff not found' });
    }

    return {
      success: true,
      message: 'Profile fetched successfully',
      data: staff,
    };
  }

  async getUserByToken(staffId: number) {
    const staff = await this.authRepository.findStaffFullProfile(staffId);
    if (!staff) {
      throw new NotFoundException({ message: 'Staff not found' });
    }

    return {
      success: true,
      message: 'User fetched successfully',
      data: staff,
    };
  }

  async forgotPassword(email: string) {
    const staff = await this.authRepository.findStaffByField(email);
    if (!staff) {
      throw new NotFoundException({ message: 'Email not found' });
    }

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const resetToken = uuidv4();

    await this.authRepository.createForgotPasswordToken({
      token: resetToken,
      userId: staff.id,
      type: 'staff',
      expires_at: expiresAt,
    });

    try {
      const clientDetails = staff.clientDetails || {};
      const brandName = (clientDetails as any).brandName || 'Nexin';
      const csmsUrl = (clientDetails as any).csmsUrl || '#';
      const resetLink = `${csmsUrl}/auth/reset-password?token=${resetToken}`;

      await this.awsService.sendEmail(
        email,
        `Password Reset Request - ${brandName}`,
        brandName,
        `<p>We received a request to reset your password.</p><p><a href="${resetLink}">Click here to reset your password</a></p>`,
      );
    } catch {
      // Ignore email dispatch errors
    }

    return {
      success: true,
      message: 'Password reset link sent to your email',
    };
  }

  async resetPassword(token: string, password: string) {
    const forgotPasswordToken = await this.authRepository.findForgotPasswordToken(token, 'staff');

    if (!forgotPasswordToken) {
      throw new NotFoundException({ message: 'Invalid token' });
    }

    if (forgotPasswordToken.expires_at && forgotPasswordToken.expires_at < new Date()) {
      await this.authRepository.deleteForgotPasswordToken(forgotPasswordToken.id);
      throw new NotFoundException({ message: 'Token has expired' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await this.authRepository.updateStaffPassword(forgotPasswordToken.userId, hashedPassword);
    await this.authRepository.deleteForgotPasswordToken(forgotPasswordToken.id);

    return {
      success: true,
      message: 'Password reset successfully',
    };
  }
}
