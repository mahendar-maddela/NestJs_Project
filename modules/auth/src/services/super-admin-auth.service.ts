import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthRepository } from '../repositories/auth.repository';
import { AwsService } from '@integrations/aws';
import { LoginDto } from '../dto/auth.dto';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { JwtPayload } from '../strategies/jwt.strategies';

@Injectable()
export class SuperAdminAuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly awsService: AwsService,
  ) { }

  async login(dto: LoginDto) {
    const admin = await this.authRepository.findSuperAdminByEmail(dto.email);
    if (!admin) {
      throw new BadRequestException({ success: false, message: 'email not found' });
    }

    if (!admin.isActive) {
      throw new BadRequestException({
        success: false,
        message: 'Account is not active please contact your administrator',
      });
    }

    const isMatch = await bcrypt.compare(dto.password, admin.password || '');
    if (!isMatch) {
      throw new BadRequestException({ success: false, message: 'Invalid password' });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);

    await this.authRepository.createOtpRecord({
      type_id: admin.id,
      otp: otpCode,
      expires_at: expiresAt,
      type: 'superAdmin',
      contact: admin.email || undefined,
    });

    if (admin.email) {
      try {
        await this.awsService.sendSuperAdminLoginOtp(admin.email, otpCode);
      } catch {
        // Ignore email dispatch error
      }
    }

    return {
      success: true,
      message: 'OTP sent successfully',
    };
  }

  async verifyOtp(otp: string | number) {
    const otpRecord = await this.authRepository.findOtpRecord(String(otp), 'superAdmin');

    if (!otpRecord) {
      throw new NotFoundException({ message: 'Invalid OTP' });
    }

    if (otpRecord.expires_at < new Date()) {
      await this.authRepository.deleteOtpRecord(otpRecord.id);
      throw new NotFoundException({ message: 'OTP has expired' });
    }

    const superAdmin = await this.authRepository.findSuperAdminById(otpRecord.type_id);

    if (!superAdmin) {
      throw new NotFoundException({ message: 'User not found' });
    }

    const payload: JwtPayload = { sub: superAdmin.id, email: superAdmin.email || undefined, actorType: 'superAdmin' };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
    const refreshTokenStr = uuidv4();

    await this.authRepository.createRefreshToken({
      userId: superAdmin.id,
      token: refreshTokenStr,
      type: 'superAdmin',
      expire: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
    });

    await this.authRepository.deleteOtpRecord(otpRecord.id);

    return {
      success: true,
      message: 'OTP verified successfully',
      superAdminAccessToken: accessToken,
      superAdminRefreshToken: refreshTokenStr,
    };
  }

  async forgotPassword(email: string) {
    const superAdmin = await this.authRepository.findSuperAdminByEmail(email);

    if (!superAdmin) {
      throw new NotFoundException({
        success: false,
        message: 'Super Admin not found',
      });
    }

    const resetToken = uuidv4();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const tokenRecord = await this.authRepository.createForgotPasswordToken({
      token: resetToken,
      userId: superAdmin.id,
      type: 'superAdmin',
      expires_at: expiresAt,
    });

    if (superAdmin.email) {
      try {
        await this.awsService.sendSuperAdminForgotPassword(superAdmin.email, tokenRecord.token);
      } catch {
        // Ignore email dispatch error
      }
    }

    return {
      success: true,
      message: 'Password reset link sent to email',
      data: {
        token: tokenRecord.token,
      },
    };
  }

  async resetPassword(token: string, password: string) {
    const forgotPasswordToken = await this.authRepository.findForgotPasswordToken(token, 'superAdmin');

    if (!forgotPasswordToken) {
      throw new NotFoundException({
        success: false,
        message: 'Invalid token',
      });
    }

    if (forgotPasswordToken.expires_at && forgotPasswordToken.expires_at < new Date()) {
      await this.authRepository.deleteForgotPasswordToken(forgotPasswordToken.id);
      throw new NotFoundException({
        success: false,
        message: 'Token has expired',
      });
    }

    const superAdmin = await this.authRepository.findSuperAdminById(forgotPasswordToken.userId);

    if (!superAdmin) {
      throw new NotFoundException({
        success: false,
        message: 'Super Admin not found',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await this.authRepository.updateSuperAdminPassword(superAdmin.id, hashedPassword);
    await this.authRepository.deleteForgotPasswordToken(forgotPasswordToken.id);

    return {
      success: true,
      message: 'Password reset successfully',
    };
  }

  async refreshToken(refreshToken: string) {
    if (!refreshToken) {
      throw new BadRequestException({ success: false, message: 'Token required' });
    }

    const refToken = await this.authRepository.findRefreshToken(refreshToken, 'superAdmin');

    if (!refToken) {
      throw new NotFoundException({ success: false, message: 'Invalid refresh token' });
    }

    if (refToken.expire < new Date()) {
      await this.authRepository.deleteRefreshToken(refToken.id);
      throw new NotFoundException({ success: false, message: 'Refresh token has expired' });
    }

    const payload: JwtPayload = { sub: refToken.userId, actorType: 'superAdmin' };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });

    return {
      success: true,
      message: 'Access token refreshed successfully',
      superAdminAccessToken: accessToken,
    };
  }

  async getUserByToken(superAdminId: number) {
    const admin = await this.authRepository.findSuperAdminById(superAdminId);
    if (!admin) {
      throw new BadRequestException({ success: false, message: 'Not found' });
    }

    return {
      success: true,
      message: 'found successfully',
      data: admin,
    };
  }

  async logout(superAdminId: number) {
    await this.authRepository.deleteRefreshTokensByUser(superAdminId, 'superAdmin');

    return {
      success: true,
      message: 'logged out successfully',
    };
  }
}
