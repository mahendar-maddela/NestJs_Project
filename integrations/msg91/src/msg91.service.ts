import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Msg91CredentialOverride } from './msg91.interface';

const MSG91_FLOW_URL = 'https://control.msg91.com/api/v5/flow';

/** Mirrors legacy `utils/globalOtpService.js` (`sendGlobalOtpSMS`/`sendGlobalOtpToWhatsApp`) and
 *  `utils/whatsAppOtp.js`'s `sendOtpSMS` — same MSG91 Flow API / WhatsApp Business API calls,
 *  same per-client credential override via `CredentialConfig.authKey`/`.template`, same global
 *  env-var fallback. Both legacy functions throw on failure rather than swallowing the error
 *  (unlike the email senders), so this preserves that — callers decide how to handle it. */
@Injectable()
export class Msg91Service {
  private readonly logger = new Logger(Msg91Service.name);

  constructor(private readonly configService: ConfigService) {}

  async sendOtpSms(mobile: string, otp: string, override?: Msg91CredentialOverride): Promise<void> {
    const templateId = override?.template || this.configService.get<string>('MSG91_TEMPLATE_ID');
    const authKey = override?.authKey || this.configService.get<string>('MSG91_AUTH_KEY');

    if (!authKey || !templateId) {
      this.logger.warn(`[DEV SMS SIMULATION] Mobile: ${mobile} | OTP: ${otp} (MSG91 not fully configured)`);
      return;
    }

    const payload = {
      template_id: templateId,
      short_url: '0',
      short_url_expiry: '300',
      realTimeResponse: '1',
      recipients: [{ mobiles: `91${mobile}`, OTP: otp }],
    };

    const response = await fetch(MSG91_FLOW_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', accept: 'application/json', authkey: authKey },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`MSG91 SMS OTP failed (${response.status}): ${body}`);
    }

    this.logger.log(`✅ OTP Sent via MSG91: Mobile: ${mobile}`);
  }

  async sendOtpWhatsApp(mobile: string, otp: string, override?: Msg91CredentialOverride): Promise<void> {
    const url = override?.template || this.configService.get<string>('WHATSAPP_API_URL');
    const token = override?.authKey || this.configService.get<string>('WHATSAPP_API_TOKEN');

    if (!url || !token) {
      this.logger.warn(`[DEV WHATSAPP SIMULATION] Mobile: ${mobile} | OTP: ${otp} (WhatsApp gateway not configured)`);
      return;
    }

    const payload = {
      messaging_product: 'whatsapp',
      to: `91${mobile}`,
      type: 'template',
      template: {
        name: 'account_verify',
        language: { code: 'en' },
        components: [{ type: 'body', parameters: [{ type: 'text', text: otp.toString() }] }],
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`WhatsApp OTP failed (${response.status}): ${body}`);
    }

    this.logger.log(`✅ WhatsApp OTP sent: Mobile: ${mobile}`);
  }
}
