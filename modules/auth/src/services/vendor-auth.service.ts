import { Injectable, BadRequestException, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vendor } from '../../../vendors/src/entities/vendor.entity';
import { AwsService } from '@integrations/aws';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { JwtPayload } from '../strategies/jwt.strategies';
import { AuthRepository } from '../repositories/auth.repository';

@Injectable()
export class VendorAuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly awsService: AwsService,
  ) { }

  async login(body: any, verifiedClientId?: number) {
    const field = body.field || body.email || body.phone;
    const password = body.password;

    if (!field || !password) {
      throw new BadRequestException({ message: 'Field (email or phone) and password are required' });
    }

    // Mirrors legacy `vendorAuthController.js` — the tenant comes from the verified `x-client-token`
    // (`req.client.clientId`), never from the request body.
    const clientId = verifiedClientId ?? body.clientId;
    const vendor = await this.authRepository.findVendorByField(field, clientId);

    if (!vendor) {
      throw new NotFoundException({ message: 'You dont have a account' });
    }

    if (vendor.status !== 'Active') {
      throw new ForbiddenException({ message: 'Your account is not active' });
    }

    const isMatch = await bcrypt.compare(password, vendor.password || '');
    if (!isMatch) {
      throw new UnauthorizedException({ message: 'Invalid password' });
    }

    const payload: JwtPayload = {
      sub: vendor.id,
      email: vendor.email || undefined,
      actorType: 'vendor',
      clientId: vendor.clientId || undefined,
    };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
    const refreshTokenStr = uuidv4();

    await this.authRepository.createRefreshToken({
      userId: vendor.id,
      token: refreshTokenStr,
      type: 'vendor',
      expire: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
    });

    return {
      success: true,
      message: 'login successfull',
      vendorAccessToken: accessToken,
      vendorRefreshToken: refreshTokenStr,
    };
  }

  async verifyOtp(otp: string | number) {
    const otpRecord = await this.authRepository.findOtpRecord(String(otp), 'vendor');

    if (!otpRecord) {
      throw new NotFoundException({ message: 'Invalid OTP' });
    }

    if (otpRecord.expires_at && otpRecord.expires_at < new Date()) {
      await this.authRepository.deleteOtpRecord(otpRecord.id);
      throw new NotFoundException({ message: 'OTP has expired' });
    }

    const vendor = await this.authRepository.findVendorById(otpRecord.type_id);

    if (!vendor) {
      throw new NotFoundException({ message: 'User not found' });
    }

    const payload: JwtPayload = {
      sub: vendor.id,
      email: vendor.email || undefined,
      actorType: 'vendor',
      clientId: vendor.clientId || undefined,
    };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
    const refreshTokenStr = uuidv4();

    await this.authRepository.createRefreshToken({
      userId: vendor.id,
      token: refreshTokenStr,
      type: 'vendor',
      expire: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
    });

    await this.authRepository.deleteOtpRecord(otpRecord.id);

    return {
      success: true,
      message: 'OTP verified successfully',
      vendorAccessToken: accessToken,
      vendorRefreshToken: refreshTokenStr,
    };
  }

  async refreshToken(refreshToken: string) {
    if (!refreshToken) {
      return { success: false, message: 'Token required' };
    }

    const refToken = await this.authRepository.findRefreshToken(refreshToken, 'vendor');

    if (!refToken) {
      throw new NotFoundException({ success: false, message: 'Invalid refresh token' });
    }

    if (refToken.expire < new Date()) {
      await this.authRepository.deleteRefreshToken(refToken.id);
      throw new NotFoundException({ success: false, message: 'Refresh token has expired' });
    }

    const payload: JwtPayload = { sub: refToken.userId, actorType: 'vendor' };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });

    return {
      success: true,
      message: 'Access token refreshed successfully',
      vendorAccessToken: accessToken,
    };
  }

  async forgotPassword(email: string) {
    const vendor = await this.authRepository.findVendorByEmail(email);

    if (!vendor) {
      throw new NotFoundException({ message: 'Vendor not found' });
    }

    const resetToken = uuidv4();
    const tokenRecord = await this.authRepository.createForgotPasswordToken({
      token: resetToken,
      userId: vendor.id,
      type: 'vendor',
      expires_at: new Date(Date.now() + 60 * 60 * 1000),
    });

    return {
      success: true,
      message: 'Password reset link sent to your email',
      data: {
        token: tokenRecord.token,
      },
    };
  }

  async resetPassword(token: string, password: string) {
    const forgotPasswordToken = await this.authRepository.findForgotPasswordToken(token, 'vendor');

    if (!forgotPasswordToken) {
      throw new NotFoundException({ message: 'Invalid token' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await this.authRepository.updateVendorPassword(forgotPasswordToken.userId, hashedPassword);

    await this.authRepository.deleteForgotPasswordToken(forgotPasswordToken.id);

    return {
      success: true,
      message: 'Password reset successfully',
    };
  }

  async resetPasswordWithMail(email: string, clientId: number) {
    if (!email) {
      throw new BadRequestException({ message: 'Email is required' });
    }

    const vendor = await this.authRepository.findVendorByEmailAndClientSelect(email, clientId);

    if (!vendor) {
      throw new NotFoundException({ message: 'email not found' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

    await this.authRepository.deleteOtpRecords(vendor.id, 'vendor');

    await this.authRepository.createOtpRecord({
      type_id: vendor.id,
      otp,
      expires_at: expiresAt,
      type: 'vendor',
      contact: vendor.email || undefined,
    });

    const clientDetails = await this.authRepository.findClientDetailsByClientId(clientId);

    await this.awsService.sendClientOtpEmail(vendor.email!, otp, clientDetails);

    return {
      success: true,
      message: 'otp reset password',
    };
  }

  async verifyOtpResetPassword(otp: string) {
    if (!otp) {
      throw new BadRequestException({ message: 'OTP is required' });
    }

    const otpRecord = await this.authRepository.findOtpRecord(otp, 'vendor');

    if (!otpRecord) {
      throw new NotFoundException({ message: 'Invalid OTP' });
    }

    if (otpRecord.expires_at && otpRecord.expires_at < new Date()) {
      await this.authRepository.deleteOtpRecord(otpRecord.id);
      throw new NotFoundException({ message: 'OTP has expired' });
    }

    const vendor = await this.authRepository.findVendorById(otpRecord.type_id);
    if (!vendor) {
      throw new NotFoundException({ message: 'User not found' });
    }

    const token = await this.authRepository.createForgotPasswordToken({
      token: uuidv4(),
      userId: vendor.id,
      type: 'vendor',
      expires_at: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });

    await this.authRepository.deleteOtpRecord(otpRecord.id);

    return {
      success: true,
      message: 'OTP verified',
      token: token.token,
    };
  }

  async getVendorBankDetails(vendorId: number) {
    const vendorDetails = await this.authRepository.findVendorById(vendorId, { vendorBankDetails: true });

    if (!vendorDetails) {
      throw new NotFoundException({ message: 'Vendor not found' });
    }

    const result = { ...vendorDetails };
    delete (result as any).password;
    delete (result as any).vendorTypeId;

    return {
      success: true,
      data: result,
      message: 'SuccessFully Fetched Details',
    };
  }

  async logout(vendorId: number) {
    await this.authRepository.deleteRefreshTokensByUser(vendorId, 'vendor');

    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  async getVendorByToken(vendorId: number) {
    const vendor = await this.authRepository.findVendorById(vendorId, { features: true });

    if (!vendor) {
      throw new NotFoundException({ message: 'Vendor not found' });
    }

    return {
      success: true,
      message: 'User fetched successfully',
      data: vendor,
    };
  }
}
