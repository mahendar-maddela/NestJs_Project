import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import validator from 'validator';
import { randomUUID } from 'crypto';
import { AuthRepository } from '../repositories/auth.repository';
import { OtpChannelService } from './otp-channel.service';
import {
  UserFcmTokenDto,
  UserLoginByContactDto,
  UserLoginWithPasswordDto,
  UserRegisterVerifyOtpDto,
  UserResendOtpDto,
  UserSignUpDto,
  UserTenantLoginDto,
  UserTenantVerifyOtpDto,
  VerifyOtpDto,
} from '../dto/auth.dto';
import { JwtPayload } from '../strategies/jwt.strategies';

function generateOtp(contact: string): string {
  if (contact === 'test@gmail.com') return '1234';
  return String(Math.floor(1000 + Math.random() * 9000));
}

function resolveContactType(contact: string): 'email' | 'phone' {
  if (validator.isEmail(contact)) return 'email';
  if (validator.isMobilePhone(contact, 'any')) return 'phone';
  throw new BadRequestException('Invalid email or phone format');
}

/**
 * Driver (mobile app + web) account auth. Mirrors legacy
 * `controllers/auth/userAuthController.js`, shared by `/v1/auth/*` and `/v1/web/auth/*`.
 *
 * Two login families exist side by side, same as legacy:
 *  - the original single-tenant OTP/password flow (`requestOtpLogin`, `loginWithPassword`, ...)
 *  - the newer multi-tenant app flow (`tenantLogin`/`tenantVerifyOtp`), which resolves
 *    `clientId`, uses `PrefixConfig` for the human-readable userId, and routes OTP delivery
 *    through `CredentialConfig.userLoginType`.
 */
@Injectable()
export class UserAuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly otpChannel: OtpChannelService,
    private readonly jwtService: JwtService,
  ) { }

  // ---- Legacy single-tenant flow ----

  /** Mirrors `userAuthController.js:signUp`. */
  async signUp(dto: UserSignUpDto, clientId: number) {
    const contactType = resolveContactType(dto.contact);
    const existingUser = await this.authRepository.findUserByContact(dto.contact);
    if (existingUser) throw new ConflictException('User already exists');

    const unverifiedUser = await this.authRepository.createUnverifiedUser({
      name: dto.name,
      email: contactType === 'email' ? dto.contact : '',
      phone: contactType === 'phone' ? dto.contact : '',
      clientId,
    });

    const otp = generateOtp(dto.contact);
    await this.authRepository.createOtpRecord({
      type_id: unverifiedUser.id,
      otp,
      expires_at: new Date(Date.now() + 5 * 60 * 1000),
      type: 'unuser',
    });

    await this.otpChannel.sendOtp(contactType, dto.contact, otp);

    return {
      success: true,
      data: unverifiedUser,
      message: `User registered successfully. OTP sent to your ${contactType}.`,
    };
  }

  /** Mirrors `userAuthController.js:registerVerifyOtp`. */
  async registerVerifyOtp(dto: UserRegisterVerifyOtpDto) {
    const otpRecord = await this.authRepository.findOtpRecord(dto.otp, 'unuser');
    const fallback = otpRecord ?? (await this.authRepository.findOtpRecord(dto.otp, 'user'));
    if (!fallback) throw new NotFoundException('Invalid OTP');
    if (fallback.expires_at < new Date()) {
      await this.authRepository.deleteOtpRecord(fallback.id);
      throw new NotFoundException('OTP has expired');
    }

    let user;
    if (fallback.type === 'unuser') {
      const unverifiedUser = await this.authRepository.findUnverifiedUserById(fallback.type_id);
      if (!unverifiedUser) throw new NotFoundException('Unverified user not found');

      user = await this.authRepository.createUser({
        first_name: unverifiedUser.name,
        phone: unverifiedUser.phone,
        email: unverifiedUser.email,
        clientId: unverifiedUser.clientId,
      });
      await this.authRepository.updateUser(user.id, { userId: `EVLSU${String(user.id).padStart(5, '0')}` });
      await this.authRepository.createWallet({ userId: user.id, balance: 0, type: 'User', clientId: unverifiedUser.clientId });
      await this.authRepository.deleteUnverifiedUser(unverifiedUser.id);
    } else if (fallback.type === 'user') {
      user = await this.authRepository.findUserById(fallback.type_id);
      if (!user) throw new NotFoundException('User not found');
    } else {
      throw new UnprocessableEntityException('Invalid OTP type');
    }

    const { accessToken, refreshToken } = await this.issueTokens(user.id);
    await this.authRepository.deleteOtpRecord(fallback.id);

    return { success: true, message: 'Login successfull', userAccessToken: accessToken, userRefreshToken: refreshToken };
  }

  /** Mirrors `userAuthController.js:userLogin`. */
  async requestOtpLogin(dto: UserLoginByContactDto) {
    const contactType = resolveContactType(dto.contact);
    const user = await this.authRepository.findUserByContact(dto.contact);
    if (!user) throw new NotFoundException(`${contactType} not found`);
    if (user.status === 'Block') throw new ForbiddenException('Your account is blocked. Contact support.');

    const otp = generateOtp(user.email === 'test@gmail.com' ? user.email : dto.contact);
    await this.authRepository.createOtpRecord({
      type_id: user.id,
      otp,
      expires_at: new Date(Date.now() + 2 * 60 * 1000),
      type: 'user',
    });

    await this.otpChannel.sendOtp(contactType, contactType === 'email' ? user.email! : user.phone!, otp);

    return {
      success: true,
      message: `OTP sent to your ${contactType}`,
      data: process.env.NODE_ENV === 'development' ? otp : undefined,
    };
  }

  /** Mirrors `userAuthController.js:userLoginWithPassword`. */
  async loginWithPassword(dto: UserLoginWithPasswordDto) {
    const user = await this.authRepository.findUserByContact(dto.contact);
    if (!user) throw new NotFoundException('Invalid Email or Phone');
    if (user.status === 'Block') throw new ForbiddenException('Please Contact Admin');

    const isMatch = await bcrypt.compare(dto.password, (user as any).password || '');
    if (!isMatch) throw new UnauthorizedException('Invalid password');

    const { accessToken, refreshToken } = await this.issueTokens(user.id, '90d');

    return { success: true, message: 'Logged in successfully', userAccessToken: accessToken, userRefreshToken: refreshToken };
  }

  /** Mirrors `userAuthController.js:userVerifyOtp` (legacy simple verify, no unverified-user branch). */
  async verifySimpleOtp(dto: VerifyOtpDto) {
    const otpRecord = await this.authRepository.findOtpRecord(dto.otp, 'user');
    if (!otpRecord || otpRecord.expires_at < new Date()) throw new NotFoundException('Invalid OTP');

    const user = await this.authRepository.findUserById(otpRecord.type_id);
    if (!user) throw new NotFoundException('User not found');

    const { accessToken, refreshToken } = await this.issueTokens(user.id, '90d');
    await this.authRepository.deleteOtpRecord(otpRecord.id);

    return { success: true, message: 'Logged in successfully', userAccessToken: accessToken, userRefreshToken: refreshToken };
  }

  /** Mirrors `userAuthController.js:resendOtpRequest`. */
  async resendOtp(dto: UserResendOtpDto) {
    const user = await this.authRepository.findUserByContact(dto.contact);
    if (!user) throw new NotFoundException('User not found');

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    await this.authRepository.createOtpRecord({
      type_id: user.id,
      otp,
      expires_at: new Date(Date.now() + 3 * 60 * 1000),
      type: 'user',
    });

    return { success: true, message: 'OTP sent', data: otp };
  }

  /** Mirrors `userAuthController.js:getUserByToken`. */
  async getUserByToken(userId: number) {
    const user = await this.authRepository.findUserById(userId, true);
    if (!user) throw new NotFoundException('User not found');
    if (user.status === 'Block') throw new ForbiddenException('Please Contact Admin');

    const totalWallets = {
      walletBalance: user.wallet?.balance ?? 0,
    };

    return {
      success: true,
      message: "User details and balance fetched successfully",
      data: {
        user: user,
        totalWallets: totalWallets,
      },
    }

  }

  /** Mirrors `userAuthController.js:logout`. */
  async logout(userId?: number) {
    if (userId) {
      await this.authRepository.deleteRefreshTokensByUser(userId, 'user');
    }
    return { success: true, message: 'logout successfully' };
  }

  /** Mirrors `userAuthController.js:addOrUpdateFcmToken`. */
  async updateFcmToken(userId: number, dto: UserFcmTokenDto) {
    const user = await this.authRepository.findUserById(userId);
    if (!user) throw new NotFoundException('Driver not found');

    await this.authRepository.updateUser(userId, { fcmToken: dto.fcmToken });
    return { success: true, message: 'FCM token updated successfully' };
  }

  async refreshToken(refreshToken: string) {
    if (!refreshToken) return { success: false, message: 'Token required' };

    const record = await this.authRepository.findRefreshToken(refreshToken, 'user');
    if (!record || record.expire < new Date()) {
      throw new NotFoundException({ success: false, message: 'Invalid or expired refresh token' });
    }

    const payload: JwtPayload = { sub: record.userId, actorType: 'user' };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '180d' });

    return { success: true, message: 'Access token refreshed successfully', userAccessToken: accessToken };
  }

  // ---- Multi-tenant app flow ----

  /** Mirrors `userAuthController.js:userAppLogin`. */
  async tenantLogin(dto: UserTenantLoginDto, clientId: number) {
    const contactType = resolveContactType(dto.contact);
    if (contactType === 'phone' && !/^[6-9]\d{9}$/.test(dto.contact)) {
      throw new BadRequestException('Please enter a valid 10-digit phone number without country code (e.g., 9876543210)');
    }

    const user = await this.authRepository.findUserByChannel(contactType, dto.contact, clientId);
    if (user?.status === 'Block') throw new ForbiddenException('Your account is blocked. Contact support.');

    const otp = generateOtp(dto.contact);
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);
    const credentialConfig = await this.authRepository.findCredentialConfig(clientId);
    const clientDetails = await this.authRepository.findClientDetailsByClientId(clientId);

    if (!user) {
      let unverifiedUser = await this.authRepository.findUnverifiedUserByContact(
        clientId,
        contactType === 'email' ? dto.contact : null,
        contactType === 'phone' ? dto.contact : null,
      );
      if (!unverifiedUser) {
        unverifiedUser = await this.authRepository.createUnverifiedUser({
          clientId,
          email: contactType === 'email' ? dto.contact : null,
          phone: contactType === 'phone' ? dto.contact : null,
        });
      }

      await this.authRepository.deleteOtpRecords(unverifiedUser.id, 'unuser');
      await this.authRepository.createOtpRecord({ type_id: unverifiedUser.id, otp, expires_at: expiresAt, type: 'unuser' });
      await this.otpChannel.sendOtpForChannel(contactType, dto.contact, otp, credentialConfig?.userLoginType, clientDetails, {
        authKey: credentialConfig?.authKey,
        template: credentialConfig?.template,
      });

      return { success: true, message: `OTP sent to your ${contactType}`, data: process.env.NODE_ENV === 'development' ? otp : undefined };
    }

    await this.authRepository.deleteOtpRecords(user.id, 'user');
    await this.authRepository.createOtpRecord({ type_id: user.id, otp, expires_at: expiresAt, type: 'user' });
    await this.otpChannel.sendOtpForChannel(
      contactType,
      contactType === 'email' ? user.email! : user.phone!,
      otp,
      credentialConfig?.userLoginType,
      clientDetails,
      { authKey: credentialConfig?.authKey, template: credentialConfig?.template },
    );

    return { success: true, message: `OTP sent to your ${contactType}`, data: process.env.NODE_ENV === 'development' ? otp : undefined };
  }

  /** Mirrors `userAuthController.js:verifyOtp` (tenant-aware). */
  async tenantVerifyOtp(dto: UserTenantVerifyOtpDto, clientId: number) {
    const otpRecord = await this.authRepository.findOtpRecord(dto.otp, 'unuser') ?? (await this.authRepository.findOtpRecord(dto.otp, 'user'));
    if (!otpRecord) throw new NotFoundException('Invalid OTP');
    if (otpRecord.expires_at < new Date()) {
      await this.authRepository.deleteOtpRecord(otpRecord.id);
      throw new NotFoundException('OTP has expired');
    }

    let user;
    if (otpRecord.type === 'unuser') {
      const unverifiedUser = await this.authRepository.findUnverifiedUserById(otpRecord.type_id, clientId);
      if (!unverifiedUser) throw new NotFoundException('Unverified user not found');

      const userCount = await this.authRepository.countUsers(clientId);
      user = await this.authRepository.createUser({
        phone: unverifiedUser.phone,
        email: unverifiedUser.email,
        isFirstLogin: true,
        clientId,
        appName: dto.appName || null,
      });

      const prefixConfig = await this.authRepository.findPrefixConfig(clientId);
      const userIdFormat = `${prefixConfig?.user || 'EVLSU'}${String(userCount + 1).padStart(5, '0')}`;
      await this.authRepository.updateUser(user.id, { userId: userIdFormat });
      await this.authRepository.createWallet({ userId: user.id, balance: 0, type: 'User', clientId });
      await this.authRepository.deleteUnverifiedUser(unverifiedUser.id);
    } else if (otpRecord.type === 'user') {
      user = await this.authRepository.findUserById(otpRecord.type_id);
      if (!user || user.clientId !== clientId) throw new NotFoundException('User not found');
    } else {
      throw new UnprocessableEntityException('Invalid OTP type');
    }

    const { accessToken, refreshToken } = await this.issueTokens(user.id);
    await this.authRepository.deleteOtpRecord(otpRecord.id);

    return { success: true, message: 'Login successfull', userAccessToken: accessToken, userRefreshToken: refreshToken };
  }

  // ---- shared ----

  private async issueTokens(userId: number, expiresIn: JwtSignOptions['expiresIn'] = '180d') {
    const payload: JwtPayload = { sub: userId, actorType: 'user' };
    const accessToken = this.jwtService.sign(payload, { expiresIn });
    const refreshTokenStr = randomUUID();

    await this.authRepository.createRefreshToken({
      userId,
      token: refreshTokenStr,
      type: 'user',
      expire: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    });

    return { accessToken, refreshToken: refreshTokenStr };
  }
}
