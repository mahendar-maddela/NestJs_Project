import { Injectable, BadRequestException, NotFoundException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { AwsService } from '@integrations/aws';
import { FleetUser } from '../../../fleet/src/entities/fleet-user.entity';
import { Wallet } from '../../../wallet/src/entities/wallet.entity';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { JwtPayload } from '../strategies/jwt.strategies';
import { AuthRepository } from '../repositories/auth.repository';

/** Mirrors `controllers/Fleet/fleetAuthController.js`. */
@Injectable()
export class FleetAuthService {
  constructor(
    @InjectRepository(FleetUser) private readonly fleetUserRepo: Repository<FleetUser>,
    @InjectRepository(Wallet) private readonly walletRepo: Repository<Wallet>,
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly awsService: AwsService,
  ) {}

  async login(body: any, verifiedClientId?: number) {
    const contact = body.contact || body.field || body.email || body.phone;
    const password = body.password;

    if (!contact || !password) {
      throw new BadRequestException({ message: 'Field (email or phone) and password are required' });
    }

    // Mirrors legacy `fleetAuthController.js` — the tenant comes from the verified `x-client-token`
    // (`req.client.clientId`), never from the request body.
    const clientId = verifiedClientId ?? body.clientId;
    const fleetUser = await this.fleetUserRepo.findOne({
      where: [
        { email: contact, type: Not('DRIVER'), clientId },
        { phone: contact, type: Not('DRIVER'), clientId },
      ],
      select: { id: true, email: true, phone: true, password: true, status: true, clientId: true },
    });

    if (!fleetUser) {
      throw new NotFoundException({ message: 'You dont have a account' });
    }

    const isMatch = await bcrypt.compare(password, fleetUser.password || '');
    if (!isMatch) {
      throw new UnauthorizedException({ message: 'Invalid password' });
    }

    if (fleetUser.status !== 'Active') {
      throw new ForbiddenException({ message: 'Your account is not active. Please contact support.' });
    }

    const payload: JwtPayload = {
      sub: fleetUser.id,
      email: fleetUser.email || undefined,
      phone: fleetUser.phone || undefined,
      actorType: 'fleetuser',
      clientId: fleetUser.clientId,
    };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
    const refreshTokenStr = uuidv4();

    await this.authRepository.createRefreshToken({
      userId: fleetUser.id,
      token: refreshTokenStr,
      type: 'fleetuser',
      expire: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    });

    return {
      success: true,
      message: 'Login verified successfully',
      fleetAccessToken: accessToken,
      fleetRefreshToken: refreshTokenStr,
    };
  }

  async verifyOtp(otp: string | number) {
    const otpRecord = await this.authRepository.findOtpRecord(String(otp), 'fleetuser');

    if (!otpRecord || otpRecord.expires_at < new Date()) {
      throw new NotFoundException({ message: 'Invalid or expired OTP' });
    }

    const fleetUser = await this.fleetUserRepo.findOne({ where: { id: otpRecord.type_id } });

    if (!fleetUser) {
      throw new NotFoundException({ message: 'Fleet user not found' });
    }

    const payload: JwtPayload = {
      sub: fleetUser.id,
      email: fleetUser.email || undefined,
      phone: fleetUser.phone || undefined,
      actorType: 'fleetuser',
      clientId: fleetUser.clientId,
    };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
    const refreshTokenStr = uuidv4();

    await this.authRepository.createRefreshToken({
      userId: fleetUser.id,
      token: refreshTokenStr,
      type: 'fleetuser',
      expire: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    });

    await this.authRepository.deleteOtpRecord(otpRecord.id);

    return {
      success: true,
      message: 'OTP verified successfully',
      fleetAccessToken: accessToken,
      fleetRefreshToken: refreshTokenStr,
    };
  }

  async refreshToken(refreshToken: string) {
    if (!refreshToken) {
      return { success: false, message: 'Token required' };
    }

    const refToken = await this.authRepository.findRefreshToken(refreshToken, 'fleetuser');

    if (!refToken || refToken.expire < new Date()) {
      throw new NotFoundException({ success: false, message: 'Invalid or expired refresh token' });
    }

    const payload: JwtPayload = { sub: refToken.userId, actorType: 'fleetuser' };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });

    return {
      success: true,
      message: 'Access token refreshed successfully',
      fleetAccessToken: accessToken,
    };
  }

  async forgotPassword(email: string, clientId: number) {
    const fleetUser = await this.fleetUserRepo.findOne({ where: { email, clientId }, select: { id: true, email: true } });
    if (!fleetUser) {
      throw new NotFoundException({ message: 'User not found' });
    }

    const resetToken = uuidv4();
    await this.authRepository.createForgotPasswordToken({
      token: resetToken,
      userId: fleetUser.id,
      type: 'fleetuser',
      expires_at: new Date(Date.now() + 5 * 60 * 1000),
    });

    try {
      const clientDetails = await this.authRepository.findClientDetailsByClientId(clientId);
      const brandName = clientDetails?.brandName || 'Nexin';
      const resetLink = `${clientDetails?.fleetUrl || '#'}/auth/reset-password?token=${resetToken}`;

      await this.awsService.sendEmail(
        fleetUser.email!,
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
    const forgotPasswordToken = await this.authRepository.findForgotPasswordToken(token, 'fleetuser');

    if (!forgotPasswordToken) {
      throw new NotFoundException({ message: 'Invalid token' });
    }

    if (forgotPasswordToken.expires_at && forgotPasswordToken.expires_at < new Date()) {
      await this.authRepository.deleteForgotPasswordToken(forgotPasswordToken.id);
      throw new NotFoundException({ message: 'Token has expired' });
    }

    const fleetUser = await this.fleetUserRepo.findOne({ where: { id: forgotPasswordToken.userId }, select: { id: true, email: true, password: true } });
    if (!fleetUser) {
      throw new NotFoundException({ message: 'User not found' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await this.fleetUserRepo.update(fleetUser.id, { password: hashedPassword });
    await this.authRepository.deleteForgotPasswordToken(forgotPasswordToken.id);

    return { success: true, message: 'Password reset successfully' };
  }

  async logout() {
    // Legacy `logOutFleet` is a pure no-op — no token invalidation. Preserved as-is.
    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  async getUserByToken(fleetUserId: number, clientId: number) {
    const fleetUser = await this.fleetUserRepo.findOne({
      where: { id: fleetUserId, clientId },
      select: { id: true, name: true, email: true, phone: true, status: true, type: true, fleetId: true },
      relations: { fleetDetail: true },
    });

    if (!fleetUser) {
      throw new NotFoundException({ success: false, message: 'Fleet user not found' });
    }
    if (fleetUser.status !== 'Active') {
      throw new ForbiddenException({ message: 'Your account is not active. Please contact support.' });
    }

    const data: any = { ...fleetUser };
    if (data.fleetDetail) {
      const wallet = await this.walletRepo.findOne({ where: { fleetId: fleetUser.fleetId! }, select: { balance: true } });
      data.fleetDetail = { ...data.fleetDetail, wallet: wallet ? { balance: wallet.balance } : null };
    }

    return {
      success: true,
      message: 'Fleet user fetched successfully',
      data,
    };
  }

  async editProfile(id: number, clientId: number, name: string | undefined, phone: string | undefined) {
    const fleetUser = await this.fleetUserRepo.findOne({ where: { id, clientId } });
    if (!fleetUser) {
      throw new NotFoundException({ success: false, message: 'Fleet user not found' });
    }

    const updated = {
      name: name ?? fleetUser.name,
      phone: phone ?? fleetUser.phone,
    };
    await this.fleetUserRepo.update(id, updated);

    return {
      success: true,
      message: 'Profile updated successfully',
      data: { ...fleetUser, ...updated },
    };
  }
}
