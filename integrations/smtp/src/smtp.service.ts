import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/** Mirrors legacy `utils/mailService.js`'s nodemailer transporter — the single-tenant OTP/password
 *  email path (as opposed to the multi-tenant, client-branded path which goes through AWS SES). */
@Injectable()
export class SmtpService {
  private readonly logger = new Logger(SmtpService.name);
  private transporter: Transporter | null = null;
  private readonly fromAddress: string | undefined;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('EMAIL_HOST');
    const user = this.configService.get<string>('MAIL_USER');
    const pass = this.configService.get<string>('MAIL_PASSKEY');
    this.fromAddress = user;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({ host, auth: { user, pass } });
    } else {
      this.logger.warn('⚠️ EMAIL_HOST/MAIL_USER/MAIL_PASSKEY not fully configured. SMTP emails will log in dev mode.');
    }
  }

  /** Mirrors `mailService.js`'s `sendMail(...).catch()` pattern — dispatch failures are logged, never thrown. */
  async sendMail(to: string, subject: string, html: string): Promise<{ success: boolean; to: string; subject: string }> {
    if (!this.transporter) {
      this.logger.log(`[DEV EMAIL SIMULATION] To: ${to} | Subject: ${subject}`);
      return { success: true, to, subject };
    }

    try {
      await this.transporter.sendMail({ from: this.fromAddress, to, subject, html });
      return { success: true, to, subject };
    } catch (error: any) {
      this.logger.error(`Error sending email to ${to}: ${error.message}`);
      return { success: false, to, subject };
    }
  }
}
