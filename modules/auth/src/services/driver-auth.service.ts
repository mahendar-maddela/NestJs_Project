import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import { AuthRepository } from '../repositories/auth.repository';
import { OtpChannelService } from './otp-channel.service';
import { JwtPayload } from '../strategies/jwt.strategies';
import { DriverLoginDto, DriverResendOtpDto, DriverVerifyOtpDto, DriverUpdateProfileDto } from '../dto/driver-auth.dto';

function generateOtp(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/** Mirrors `controllers/APP/FleetDriver/driverAuthController.js`. */
@Injectable()
export class DriverAuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly otpChannel: OtpChannelService,
    private readonly jwtService: JwtService,
  ) {}

  async driverLogin(clientId: number, dto: DriverLoginDto) {
    if (!dto.contact || !dto.fleetId) {
      throw new BadRequestException({ message: 'Fleet Id and phone is required' });
    }

    const fleet = await this.authRepository.findFleetDetailByFleetUId(dto.fleetId, clientId);
    if (!fleet) {
      throw new NotFoundException({ message: 'Fleet not found !' });
    }

    const driver = await this.authRepository.findDriverByFleetPhoneClient(fleet.id, dto.contact, clientId);
    if (!driver) {
      throw new NotFoundException({ message: 'User not found' });
    }

    if (driver.status !== 'Active') {
      throw new ForbiddenException({ message: 'Your account is blocked. Contact Fleet Manager .' });
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);
    await this.authRepository.createOtpRecord({ type_id: driver.id, otp, expires_at: expiresAt, type: 'fleetuser' });

    const credentialConfig = await this.authRepository.findCredentialConfig(clientId);
    await this.otpChannel.sendOtpForChannel('phone', driver.phone!, otp, credentialConfig?.userLoginType, undefined, {
      authKey: credentialConfig?.authKey,
      template: credentialConfig?.template,
    });

    return {
      success: true,
      message: 'OTP sent to your mobile number',
      data: {
        otp: process.env.NODE_ENV === 'development' ? otp : undefined,
        driverId: driver.id,
      },
    };
  }

  async resendOtp(clientId: number, dto: DriverResendOtpDto) {
    const driver = await this.authRepository.findDriverByIdClientSelect(dto.driverId, clientId);
    if (!driver) {
      throw new BadRequestException({ success: false, message: 'Driver Not Found !' });
    }

    const existingOtp = await this.authRepository.findOtpRecordByTypeId(dto.driverId, 'fleetuser');
    if (!existingOtp) {
      throw new BadRequestException({ success: false, message: 'Otp Not Found !' });
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);
    await this.authRepository.updateOtpRecord(existingOtp.id, { type_id: dto.driverId, otp, expires_at: expiresAt, type: 'fleetuser' });

    const credentialConfig = await this.authRepository.findCredentialConfig(clientId);
    await this.otpChannel.sendOtpForChannel('phone', driver.phone!, otp, credentialConfig?.userLoginType, undefined, {
      authKey: credentialConfig?.authKey,
      template: credentialConfig?.template,
    });

    return { success: true, message: 'OTP Resend successfull.', data: otp };
  }

  async registerVerifyOtp(clientId: number, dto: DriverVerifyOtpDto) {
    if (!dto.otp) {
      throw new BadRequestException({ message: 'OTP is required' });
    }

    const otpRecord = await this.authRepository.findOtpRecord(dto.otp, 'fleetuser');
    if (!otpRecord) {
      throw new NotFoundException({ message: 'Invalid OTP' });
    }
    if (otpRecord.expires_at < new Date()) {
      await this.authRepository.deleteOtpRecord(otpRecord.id);
      throw new NotFoundException({ message: 'OTP has expired' });
    }

    const driver = await this.authRepository.findDriverByIdClient(otpRecord.type_id, clientId);
    if (!driver) {
      throw new NotFoundException({ message: 'User not found' });
    }
    if (driver.status === 'Block') {
      throw new ForbiddenException({ message: 'Your account is blocked. Contact support.' });
    }

    const payload: JwtPayload = { sub: driver.id, phone: driver.phone || undefined, actorType: 'fleetuser', clientId: driver.clientId };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '180d' });
    const refreshTokenStr = uuidv4();

    await this.authRepository.createRefreshToken({
      userId: driver.id,
      token: refreshTokenStr,
      type: 'fleetuser',
      expire: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    });

    await this.authRepository.deleteOtpRecord(otpRecord.id);

    return {
      success: true,
      message: 'Login successful',
      userAccessToken: accessToken,
      userRefreshToken: refreshTokenStr,
    };
  }

  async getDriverByToken(driverId: number, clientId: number) {
    const driver = await this.authRepository.findDriverByIdClient(driverId, clientId);
    if (!driver) {
      throw new NotFoundException({ message: 'Driver not found' });
    }
    return { success: true, message: 'Driver fetched successfully', data: driver };
  }

  async driverLogout(driverId: number) {
    await this.authRepository.deleteRefreshTokensByUser(driverId, 'fleetuser');
    return { success: true, message: 'Logged out successfully' };
  }

  async updateProfile(driverId: number, clientId: number, dto: DriverUpdateProfileDto) {
    if (!dto.name && !dto.email && !dto.address) {
      throw new BadRequestException({ message: 'At least one field (name, email, address) is required' });
    }

    const driver = await this.authRepository.findDriverByIdClient(driverId, clientId);
    if (!driver) {
      throw new NotFoundException({ message: 'User not found' });
    }
    if (driver.status === 'Block') {
      throw new ForbiddenException({ message: 'Your account is blocked. Contact support.' });
    }

    const updates: any = {};
    if (dto.name) updates.name = dto.name;
    if (dto.email) updates.email = dto.email;
    if (dto.address) updates.address = dto.address;

    if (Object.keys(updates).length > 0) {
      await this.authRepository.updateDriver(driver.id, updates);
    }

    return { success: true, message: 'Profile updated successfully' };
  }
}
