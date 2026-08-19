import { BadRequestException, Injectable } from '@nestjs/common';
import { SmtpService } from '@integrations/smtp';
import { AwsService, ClientBrandingDetails } from '@integrations/aws';
import { Msg91Service, Msg91CredentialOverride } from '@integrations/msg91';
import { UserLoginChannel } from 'database/src';

export type OtpContactType = 'email' | 'phone';

/**
 * Delivers OTP codes over email/SMS/WhatsApp. Mirrors legacy `utils/mailService.js` (single-tenant
 * `sendEmailOtp`, nodemailer), `utils/awsEmailService.js` (multi-tenant `sendOTPEmail`, AWS SES),
 * and `utils/globalOtpService.js` / `utils/whatsAppOtp.js` (MSG91 SMS + WhatsApp Business API).
 */
@Injectable()
export class OtpChannelService {
  constructor(
    private readonly smtp: SmtpService,
    private readonly aws: AwsService,
    private readonly msg91: Msg91Service,
  ) {}

  /** Mirrors `userAuthController.js:sendEmailOtp` (single-tenant flow — plain SMTP, no client branding). */
  async sendOtp(contactType: OtpContactType, contact: string, otp: string, clientBrandName?: string): Promise<void> {
    if (contactType === 'email') {
      await this.smtp.sendMail(contact, `🔐 ${clientBrandName || 'Nexin'} OTP Code`, `Your OTP is <strong>${otp}</strong>. It expires in 2 minutes.`);
      return;
    }

    await this.msg91.sendOtpSms(contact, otp);
  }

  /** Mirrors `userAppLogin`/`verifyOtp`'s per-tenant channel routing via `CredentialConfig.userLoginType`. */
  async sendOtpForChannel(
    contactType: OtpContactType,
    contact: string,
    otp: string,
    loginType: UserLoginChannel | null | undefined,
    clientDetails?: ClientBrandingDetails | null,
    credentialOverride?: Msg91CredentialOverride | null,
  ): Promise<void> {
    if (contactType === 'email') {
      await this.aws.sendClientOtpEmail(contact, otp, clientDetails);
      return;
    }

    if (loginType === 'Whatsapp') {
      await this.msg91.sendOtpWhatsApp(contact, otp, credentialOverride ?? undefined);
      return;
    }
    if (loginType === 'Phone') {
      await this.msg91.sendOtpSms(contact, otp, credentialOverride ?? undefined);
      return;
    }

    throw new BadRequestException({ message: 'Login with email' });
  }
}
