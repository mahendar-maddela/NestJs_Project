import { BadRequestException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import validator from 'validator';
import { UserProfileRepository } from '../repositories/user-profile.repository';
import { OtpChannelService } from '@modules/auth';

interface UpdateProfileBody {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  gst?: string;
  password?: string;
}

function resolveContactType(contact: string): 'email' | 'phone' {
  if (validator.isEmail(contact)) return 'email';
  if (validator.isMobilePhone(contact, 'any')) return 'phone';
  throw new BadRequestException('Invalid email or phone format');
}

/** Driver profile (view/update + email-OTP-gated contact change). Mirrors legacy `controllers/Web/profileController.js`. */
@Injectable()
export class UserProfileService {
  constructor(
    private readonly repo: UserProfileRepository,
    private readonly otpChannel: OtpChannelService,
  ) {}

  async getProfile(userId: number, clientId: number) {
    const user = await this.repo.findProfile(userId, clientId);
    const [totalVehicles, totalChargingSessions, totalFavourites] = await Promise.all([
      this.repo.countVehicles(userId, clientId),
      this.repo.countChargingSessions(userId, clientId),
      this.repo.countFavourites(userId),
    ]);

    return {
      success: true,
      message: 'Profile fetched successfully',
      data: { ...user, stats: { totalVehicles, totalChargingSessions, totalFavourites } },
    };
  }

  async updateProfile(userId: number, clientId: number, body: UpdateProfileBody) {
    const user = await this.repo.findUserForUpdate(userId, clientId);
    if (!user) throw new NotFoundException('User not found');

    const data: Record<string, unknown> = { ...body };

    if (body.password) {
      data.password = await bcrypt.hash(body.password, 10);
    }

    if (body.email && body.email !== user.email) {
      const existing = await this.repo.findUserByField('email', body.email, clientId);
      if (existing) throw new BadRequestException('Email already in use');
    }

    if (body.phone && body.phone !== user.phone) {
      if (!/^[6-9]\d{9}$/.test(body.phone)) {
        throw new BadRequestException('Please enter a valid 10-digit phone number without country code (e.g., 9876543210)');
      }
      const existing = await this.repo.findUserByField('phone', body.phone, clientId);
      if (existing) throw new BadRequestException('Phone number already in use');
    }

    const updated = await this.repo.updateUser(userId, { ...data, isFirstLogin: false });
    return { success: true, message: 'Profile updated successfully', data: updated };
  }

  /** Mirrors `profileController.js:sendEmailOtpForProfileUpdate`. */
  async sendContactUpdateOtp(userId: number, clientId: number, contact: string) {
    const user = await this.repo.findUserForUpdate(userId, clientId);
    if (!user) throw new NotFoundException('User not found');

    const contactType = resolveContactType(contact);
    if (contactType === 'phone' && !/^[6-9]\d{9}$/.test(contact)) {
      throw new BadRequestException('Please enter a valid 10-digit phone number without country code (e.g., 9876543210)');
    }

    const existing = await this.repo.findUserByField(contactType, contact, clientId);
    if (existing) throw new BadRequestException('Contact already in use');

    const recentOtp = await this.repo.findRecentOtp(userId, 60 * 1000);
    if (recentOtp) throw new HttpException('Please wait before requesting another OTP', HttpStatus.TOO_MANY_REQUESTS);

    await this.repo.deleteOtps(userId);

    const otp = String(Math.floor(1000 + Math.random() * 9000));
    await this.repo.createOtp({ type_id: userId, otp, expires_at: new Date(Date.now() + 2 * 60 * 1000), type: 'user', contact });

    const credentialConfig = await this.repo.findCredentialConfig(clientId);
    const clientDetails = await this.repo.findClientDetails(clientId);
    await this.otpChannel.sendOtpForChannel(contactType, contact, otp, credentialConfig?.userLoginType, clientDetails, {
      authKey: credentialConfig?.authKey,
      template: credentialConfig?.template,
    });

    return { success: true, message: 'OTP sent successfully' };
  }

  /** Mirrors `profileController.js:verifyEmailOtpForProfileUpdate`. */
  async verifyContactUpdateOtp(userId: number, clientId: number, otp: string) {
    const user = await this.repo.findUserForUpdate(userId, clientId);
    if (!user) throw new NotFoundException('User not found');

    const otpRecord = await this.repo.findOtpWithContact(userId, otp);
    if (!otpRecord) throw new NotFoundException('Invalid OTP');
    if (otpRecord.expires_at < new Date()) throw new BadRequestException('OTP has expired');

    const contactType = resolveContactType(otpRecord.contact!);
    await this.repo.updateUser(userId, { [contactType]: otpRecord.contact });
    await this.repo.deleteOtp(otpRecord.id);

    return { success: true, message: `${contactType} updated successfully` };
  }
}
