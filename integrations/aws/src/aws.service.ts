import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/cloudfront-signer';
import * as fs from 'fs';
import * as path from 'path';
import { ClientBrandingDetails } from './aws.interface';

async function fileToBuffer(fileInput: any): Promise<Buffer> {
  if (!fileInput || typeof fileInput === 'function') return Buffer.from([]);
  if (Buffer.isBuffer(fileInput)) {
    return fileInput;
  }
  if (fileInput.buffer && Buffer.isBuffer(fileInput.buffer)) {
    return fileInput.buffer;
  }
  if (fileInput.data && Buffer.isBuffer(fileInput.data)) {
    return fileInput.data;
  }
  if (typeof fileInput.toBuffer === 'function') {
    return await fileInput.toBuffer();
  }
  if (fileInput.file && typeof fileInput.file.pipe === 'function') {
    const chunks: Uint8Array[] = [];
    for await (const chunk of fileInput.file) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }
  if (typeof fileInput.pipe === 'function') {
    const chunks: Uint8Array[] = [];
    for await (const chunk of fileInput) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }
  if (typeof fileInput === 'string') {
    return Buffer.from(fileInput, 'utf-8');
  }
  if (ArrayBuffer.isView(fileInput)) {
    return Buffer.from(fileInput.buffer, fileInput.byteOffset, fileInput.byteLength);
  }
  return Buffer.from([]);
}

@Injectable()
export class AwsService {
  private readonly logger = new Logger(AwsService.name);
  private sesClient: SESClient | null = null;
  private s3Client: S3Client | null = null;
  private bucketName: string;
  private cloudfrontDomain: string;
  private cloudfrontKeyPairId: string | null = null;
  private privateKey: string | null = null;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION', 'ap-south-2');
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');

    this.bucketName = this.configService.get<string>('AWS_BUCKET_NAME', 'nexin-media');
    this.cloudfrontDomain = this.configService.get<string>('CLOUDFRONT_DOMAIN', 'https://media.nexinev.com').replace(/\/+$/, '');
    this.cloudfrontKeyPairId =
      this.configService.get<string>('AWS_CLOUDFRONT_KEY_PAIR_ID') ||
      this.configService.get<string>('CLOUDFRONT_KEY_PAIR_ID') ||
      null;

    const rawPrivateKey =
      this.configService.get<string>('AWS_CLOUDFRONT_PRIVATE_KEY') ||
      this.configService.get<string>('CLOUDFRONT_PRIVATE_KEY');

    if (rawPrivateKey) {
      this.privateKey = rawPrivateKey.replace(/\\n/g, '\n');
    } else {
      const candidatePaths = [
        this.configService.get<string>('AWS_CLOUDFRONT_PRIVATE_KEY_PATH'),
        this.configService.get<string>('CLOUDFRONT_PRIVATE_KEY_PATH'),
        path.join(__dirname, 'private_key.pem'),
        path.join(process.cwd(), 'private_key.pem'),
        path.join(process.cwd(), 'integrations', 'aws', 'src', 'private_key.pem'),
        path.join(process.cwd(), 'dist', 'integrations', 'aws', 'src', 'private_key.pem'),
      ].filter(Boolean) as string[];

      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          try {
            this.privateKey = fs.readFileSync(p, 'utf8');
            this.logger.log(`✅ Loaded CloudFront private key from ${p}`);
            break;
          } catch (e: any) {
            this.logger.warn(`Failed reading CloudFront private key from ${p}: ${e.message}`);
          }
        }
      }
    }

    if (accessKeyId && secretAccessKey) {
      this.sesClient = new SESClient({
        region,
        credentials: { accessKeyId, secretAccessKey },
      });
      this.s3Client = new S3Client({
        region,
        credentials: { accessKeyId, secretAccessKey },
      });
      this.logger.log(`✅ AWS SES & S3 Clients initialized for region ${region}`);
    } else {
      this.logger.warn(`⚠️ AWS credentials missing. Email dispatches and S3 uploads will log in dev mode.`);
    }

    if (!this.cloudfrontKeyPairId || !this.privateKey) {
      this.logger.warn(`⚠️ AWS CloudFront KeyPairId or PrivateKey missing. Signed URLs will fall back to public URLs.`);
    }
  }

  async uploadToS3(fileInput: any, folder: string, fileName: string, mimetype: string): Promise<string> {
    const key = `${folder}/${fileName}`;
    const buffer = await fileToBuffer(fileInput);

    if (!this.s3Client) {
      this.logger.log(`[DEV S3 UPLOAD SIMULATION] Key: ${key} | Bucket: ${this.bucketName}`);
      return key;
    }

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
      });

      await this.s3Client.send(command);
      this.logger.log(`✅ S3 File uploaded successfully: ${key}`);
      return key;
    } catch (err: any) {
      this.logger.error(`❌ AWS S3 Upload Error for ${key}: ${err.message}`);
      throw err;
    }
  }

  async deleteS3File(key: string): Promise<void> {
    if (!this.s3Client) {
      this.logger.log(`[DEV S3 DELETE SIMULATION] Key: ${key}`);
      return;
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      await this.s3Client.send(command);
      this.logger.log(`✅ S3 File deleted successfully: ${key}`);
    } catch (err: any) {
      this.logger.error(`❌ AWS S3 Delete Error for ${key}: ${err.message}`);
    }
  }

  getCloudfrontUrl(key: string): string {
    if (!key) return '';
    if (key.startsWith('http://') || key.startsWith('https://')) return key;

    const cleanKey = key.startsWith('/') ? key.slice(1) : key;
    const url = `${this.cloudfrontDomain}/${cleanKey}`;

    if (this.cloudfrontKeyPairId && this.privateKey) {
      try {
        const dateLessThan = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days
        const signedUrl = getSignedUrl({
          url,
          keyPairId: this.cloudfrontKeyPairId,
          dateLessThan,
          privateKey: this.privateKey,
        });
        return signedUrl;
      } catch (err: any) {
        this.logger.error(`❌ CloudFront signing error for ${key}: ${err.message}`);
        return url;
      }
    }

    return url;
  }

  async sendEmail(toMail: string, subject: string, brandName: string, html: string): Promise<void> {
    const fromEmail = this.configService.get<string>('AWS_SES_FROM_EMAIL', 'support@nexinev.com');

    if (!this.sesClient) {
      this.logger.log(`[DEV EMAIL SIMULATION] To: ${toMail} | Subject: ${subject} | From: ${brandName} <${fromEmail}>`);
      return;
    }

    try {
      const command = new SendEmailCommand({
        Source: `${brandName} <${fromEmail}>`,
        Destination: {
          ToAddresses: [toMail],
        },
        Message: {
          Subject: { Data: subject },
          Body: { Html: { Data: html } },
        },
      });

      const response = await this.sesClient.send(command);
      this.logger.log(`✅ Email sent to ${toMail}. Message ID: ${response.MessageId}`);
    } catch (err: any) {
      this.logger.error(`❌ AWS SES Email Dispatch Error to ${toMail}: ${err.message}`);
    }
  }

  async sendSuperAdminLoginOtp(email: string, otp: string): Promise<void> {
    const year = new Date().getFullYear();
    const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f3f5f9; padding: 40px 0;">
      <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:auto;background:#ffffff;border-radius:12px;box-shadow:0 4px 10px rgba(0,0,0,0.08);overflow:hidden;">
        <tr>
          <td style="background: linear-gradient(135deg, #5588e9ff 0%, #0072BC 80%); padding:20px 25px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="left" valign="middle" style="width:40%;">
                  <img src="https://admin.nexinev.com/assets/loginLogoD-Cs8OZH6W.png" alt="Nexin Logo" style="max-width:120px;height:auto;display:block;" />
                </td>
                <td align="right" valign="middle" style="width:60%;">
                  <h1 style="margin:0;font-size:18px;color:#ffffff;font-weight:600;">Nexin EV Solutions</h1>
                  <p style="margin:4px 0 0;font-size:12px;color:#e0ecff;">Secure Verification</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:30px 25px;text-align:center;">
            <h2 style="color:#0072BC;margin-bottom:20px;font-size:20px;">Your One-Time Password (OTP)</h2>
            <p style="color:#444;font-size:15px;margin-bottom:25px;line-height:1.6;">
              Hello from <strong>Nexin EV Solutions</strong> 👋<br/>
              Use the OTP below to complete your verification.<br/>
              This code will expire in <strong>2 minutes</strong>.
            </p>
            <div style="background:#f0f9ff;border:2px dashed #0072BC;border-radius:10px;display:inline-block;padding:16px 35px;margin-bottom:20px;">
              <span style="font-size:28px;letter-spacing:6px;color:#0072BC;font-weight:bold;">${otp}</span>
            </div>
            <p style="color:#777;font-size:13px;margin-top:15px;">If you didn’t request this OTP, you can safely ignore this email.</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8f9fb;padding:18px;text-align:center;">
            <p style="font-size:13px;color:#666;margin:0;">
              Need help? <a href="mailto:support@nexinev.com" style="color:#0072BC;text-decoration:none;">Contact Nexin Support</a>
            </p>
            <p style="font-size:12px;color:#999;margin-top:6px;">© ${year} Nexin EV Solutions. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </div>`;

    await this.sendEmail(email, '🔐 NexinEv OTP Code', 'NexinEv', html);
  }

  async sendSuperAdminForgotPassword(email: string, token: string): Promise<void> {
    const year = new Date().getFullYear();
    const resetUrl = `https://admin.nexinev.com/auth/reset-password?token=${token}`;
    const html = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;background-color:#f3f5f9;padding:40px 0;">
      <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:auto;background:#ffffff;border-radius:12px;box-shadow:0 4px 10px rgba(0,0,0,0.08);overflow:hidden;">
        <tr>
          <td style="background:#0072BC;padding:20px 25px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="left" valign="middle" style="width:40%;">
                  <img src="https://admin.nexinev.com/assets/loginLogoD-Cs8OZH6W.png" alt="Nexin Logo" style="max-width:120px;height:auto;display:block;" />
                </td>
                <td align="right" valign="middle" style="width:60%;">
                  <h1 style="margin:0;font-size:18px;color:#ffffff;font-weight:600;">Nexin EV Solutions</h1>
                  <p style="margin:4px 0 0;font-size:12px;color:#e6f0ff;">Password Reset Request</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:30px 25px;text-align:center;">
            <h2 style="color:#0072BC;margin-bottom:20px;font-size:20px;">Reset Your Password</h2>
            <p style="color:#444;font-size:15px;line-height:1.6;margin-bottom:25px;">
              We received a request to reset your password for your <strong>Nexin EV Solutions</strong> account.<br/><br/>
              Click the button below to proceed with resetting your password.
            </p>
            <div style="margin:25px 0;">
              <a href="${resetUrl}" style="background-color:#0072BC;color:#ffffff;text-decoration:none;padding:12px 30px;border-radius:6px;font-weight:600;display:inline-block;font-size:15px;">
                Reset Password
              </a>
            </div>
            <p style="color:#777;font-size:13px;margin-top:15px;">If you didn’t request this, you can safely ignore this email.</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8f9fb;padding:18px;text-align:center;">
            <p style="font-size:13px;color:#666;margin:0;">
              Need help? <a href="mailto:support@nexinev.com" style="color:#0072BC;text-decoration:none;">Contact Nexin Support</a>
            </p>
            <p style="font-size:12px;color:#999;margin-top:6px;">© ${year} Nexin EV Solutions. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </div>`;

    await this.sendEmail(email, 'Password Reset Request - Nexin Ev Solutions', 'NexinEv', html);
  }

  /** Mirrors `utils/awsEmailService.js:sendOTPEmail` — the multi-tenant, client-branded OTP email
   *  used by the tenant-aware User app login flow (`userAppLogin`/`verifyOtp`), as opposed to
   *  `sendSuperAdminLoginOtp`'s fixed Nexin branding. */
  async sendClientOtpEmail(email: string, otp: string, clientDetails: ClientBrandingDetails | null | undefined): Promise<void> {
    const year = new Date().getFullYear();
    const primaryColor = clientDetails?.primaryColor || '#5d56e7ff';
    const brandName = clientDetails?.brandName || '';
    const supportEmail = clientDetails?.contactEmail || '';
    const businessUrl = clientDetails?.businessUrl || '';
    const logoUrl = clientDetails?.logoUrl || '';

    const html = `
    <html>
      <body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="padding:30px 0;background:#f4f6f8;">
          <tr>
            <td align="center">
              <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
                <tr>
                  <td align="center" style="background:${primaryColor};padding:30px 20px;color:#ffffff;">
                    ${logoUrl ? `<img src="${logoUrl}" alt="${brandName}" height="45" style="display:block;margin-bottom:10px;" />` : ''}
                    <h2 style="margin:0;font-weight:600;">${brandName}</h2>
                  </td>
                </tr>
                <tr>
                  <td style="padding:40px 35px;">
                    <h3 style="margin-top:0;color:#111;font-size:20px;">OTP Verification</h3>
                    <p style="color:#555;font-size:14px;line-height:1.6;">
                      You recently requested a One-Time Password (OTP) to verify your identity with
                      <strong>${brandName}</strong>.
                    </p>
                    <div style="margin:30px 0;padding:20px;background:#f9fafb;border:1px dashed #ddd;text-align:center;border-radius:8px;">
                      <div style="font-size:12px;color:#888;margin-bottom:8px;text-transform:uppercase;">
                        Your OTP Code
                      </div>
                      <div style="font-size:34px;font-weight:bold;letter-spacing:8px;color:#111;">
                        ${otp}
                      </div>
                      <div style="font-size:12px;color:#999;margin-top:8px;">
                        This code expires in <strong style="color:#dc2626;">2 minutes</strong>.
                      </div>
                    </div>
                    <p style="font-size:13px;color:#666;line-height:1.6;">
                      For your security, do not share this code with anyone. ${brandName} will never ask for your OTP.
                    </p>
                    ${businessUrl ? `
                <div style="margin-top:30px;text-align:center;">
                  <a href="${businessUrl}"
                    style="background:${primaryColor};color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:6px;font-size:14px;font-weight:600;display:inline-block;">
                    Visit ${brandName}
                  </a>
                </div>` : ''}
                  </td>
                </tr>
                <tr>
                  <td style="background:#f9fafb;padding:25px;text-align:center;font-size:12px;color:#888;">
                    ${supportEmail ? `
                  Need help? Contact us at
                  <a href="mailto:${supportEmail}" style="color:${primaryColor};text-decoration:none;">
                    ${supportEmail}
                  </a><br/><br/>` : ''}
                    © ${year} ${brandName}. All rights reserved.<br />
                    This is an automated email. Please do not reply directly.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>`;

    await this.sendEmail(email, `OTP Verification – ${brandName} `, brandName || 'Nexin', html);
  }

  /**
   * Client-branded credentials email on vendor creation.
   * Mirrors legacy `awsEmailService.js:sendPasswordCredentialEmailToVendor` — header/branding
   * (primaryColor, logoUrl, brandName, cpoUrl login link, address footer) come from the client's
   * `ClientDetails`, so every tenant's mail is branded per multi-tenancy.
   */
  async sendVendorCredentialsEmail(
    name: string,
    email: string,
    dummyPassword: string,
    clientDetails?: ClientBrandingDetails | null,
  ): Promise<void> {
    const primaryColor = clientDetails?.primaryColor || '#4f46e5';
    const brandName = clientDetails?.brandName || '';
    const supportEmail = clientDetails?.contactEmail || '';
    const logoUrl = clientDetails?.logoUrl || '';
    const loginUrl = clientDetails?.cpoUrl || '#';
    const year = new Date().getFullYear();

    const html = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;background-color:#f3f5f9;padding:40px 0;">
      <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:auto;background:#ffffff;border-radius:12px;box-shadow:0 4px 10px rgba(0,0,0,0.08);overflow:hidden;">
        <tr>
          <td style="background:${primaryColor};padding:20px 25px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="left" valign="middle" style="width:40%;">
                  ${logoUrl ? `<img src="${logoUrl}" alt="${brandName}" style="max-width:120px;height:auto;display:block;" />` : ''}
                </td>
                <td align="right" valign="middle" style="width:60%;">
                  <h1 style="margin:0;font-size:18px;color:#ffffff;font-weight:600;">${brandName}</h1>
                  <p style="margin:4px 0 0;font-size:12px;color:#e6f0ff;">Dashboard Credentials</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:30px 25px;">
            <p style="margin:0 0 10px;font-size:16px;font-weight:600;color:#111;">Hello, ${name} 👋</p>
            <p style="margin:0 0 25px;font-size:14px;color:#555;line-height:1.7;">
              Your account with <strong>${brandName}</strong> has been successfully created. Please use the credentials below to log in:
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:25px;">
              <tr>
                <td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;">
                  <span style="font-size:12px;color:#6b7280;font-weight:600;">Login URL</span><br/>
                  <a href="${loginUrl}" style="color:${primaryColor};text-decoration:none;font-weight:600;">${loginUrl}</a>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;">
                  <span style="font-size:12px;color:#6b7280;font-weight:600;">Email</span><br/>
                  <span style="font-size:14px;color:#111;font-weight:600;">${email}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 18px;">
                  <span style="font-size:12px;color:#6b7280;font-weight:600;">Temporary Password</span><br/>
                  <span style="font-size:15px;color:#111;font-weight:700;font-family:monospace;background:#e6f0ff;padding:4px 10px;border-radius:5px;display:inline-block;">${dummyPassword}</span>
                </td>
              </tr>
            </table>
            <p style="font-size:13px;color:#b45309;background:#fff7ed;border-left:4px solid #f59e0b;padding:12px 15px;border-radius:6px;margin-bottom:25px;">
              🔒 Please save this password securely for future reference.
            </p>
            <div style="text-align:center;margin-bottom:25px;">
              <a href="${loginUrl}" style="background:${primaryColor};color:#ffffff;text-decoration:none;padding:12px 30px;border-radius:6px;font-weight:600;display:inline-block;font-size:14px;">Access Dashboard</a>
            </div>
            <p style="font-size:12px;color:#777;text-align:center;">
              Need help?
              <a href="mailto:${supportEmail}" style="color:${primaryColor};text-decoration:none;">Contact Support</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8f9fb;padding:18px;text-align:center;">
            <p style="font-size:12px;color:#999;margin:0;">
              ${clientDetails?.address ? `${clientDetails.address}<br/>` : ''}
              © ${year} ${brandName}. All rights reserved.<br/>
              This is an automated email. Please do not reply.
            </p>
          </td>
        </tr>
      </table>
    </div>
    `;

    await this.sendEmail(email, `Welcome to ${brandName} – Your Dashboard Credentials`, brandName || 'Nexin', html);
  }

  /**
   * Client-branded credentials email on fleet-user creation.
   * Mirrors legacy `awsEmailService.js:sendGlobalFleetUserCredentials` (branding from ClientDetails,
   * login link = fleetUrl).
   */
  async sendFleetUserCredentialsEmail(
    name: string,
    email: string,
    dummyPassword: string,
    clientDetails?: ClientBrandingDetails | null,
  ): Promise<void> {
    const primaryColor = clientDetails?.primaryColor || '#4f46e5';
    const brandName = clientDetails?.brandName || '';
    const supportEmail = clientDetails?.contactEmail || '';
    const logoUrl = clientDetails?.logoUrl || '';
    const fleetDashboardUrl = clientDetails?.fleetUrl || '';
    const year = new Date().getFullYear();

    const html = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;background-color:#f3f5f9;padding:40px 0;">
      <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:auto;background:#ffffff;border-radius:12px;box-shadow:0 4px 10px rgba(0,0,0,0.08);overflow:hidden;">
        <tr>
          <td style="background:${primaryColor};padding:20px 25px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="left" valign="middle" style="width:40%;">
                  ${logoUrl ? `<img src="${logoUrl}" alt="${brandName}" style="max-width:120px;height:auto;display:block;" />` : ''}
                </td>
                <td align="right" valign="middle" style="width:60%;">
                  <h1 style="margin:0;font-size:18px;color:#ffffff;font-weight:600;">${brandName}</h1>
                  <p style="margin:4px 0 0;font-size:12px;color:#e6f0ff;">Fleet Dashboard Access</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:30px 25px;">
            <p style="margin:0 0 10px;font-size:16px;font-weight:600;color:#111;">Hello, ${name} 👋</p>
            <p style="margin:0 0 25px;font-size:14px;color:#555;line-height:1.7;">
              Your Fleet account has been successfully created. You can now manage your fleet using the credentials below:
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:25px;">
              <tr>
                <td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;">
                  <span style="font-size:12px;color:#6b7280;font-weight:600;">Email</span><br/>
                  <span style="font-size:14px;color:#111;font-weight:600;">${email}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 18px;">
                  <span style="font-size:12px;color:#6b7280;font-weight:600;">Temporary Password</span><br/>
                  <span style="font-size:15px;color:#111;font-weight:700;font-family:monospace;background:#e6f0ff;padding:4px 10px;border-radius:5px;display:inline-block;">${dummyPassword}</span>
                </td>
              </tr>
            </table>
            <p style="font-size:13px;color:#b45309;background:#fff7ed;border-left:4px solid #f59e0b;padding:12px 15px;border-radius:6px;margin-bottom:25px;">
              🔒 Please save this password securely for future reference.
            </p>
            <div style="text-align:center;margin-bottom:25px;">
              <a href="${fleetDashboardUrl}" style="background:${primaryColor};color:#ffffff;text-decoration:none;padding:12px 30px;border-radius:6px;font-weight:600;display:inline-block;font-size:14px;">Access Fleet Dashboard</a>
            </div>
            <p style="font-size:12px;color:#777;text-align:center;">
              Need help?
              <a href="mailto:${supportEmail}" style="color:${primaryColor};text-decoration:none;">Contact Support</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8f9fb;padding:18px;text-align:center;">
            <p style="font-size:12px;color:#999;margin:0;">
              © ${year} ${brandName}. All rights reserved.<br/>
              This is an automated email. Please do not reply.
            </p>
          </td>
        </tr>
      </table>
    </div>
    `;

    await this.sendEmail(email, `Welcome to ${brandName} – Your Fleet Dashboard Credentials`, brandName || 'Nexin', html);
  }

  /**
   * CSMS onboarding email on client (tenant) creation by the super admin.
   * Mirrors legacy `awsEmailService.js:sendEmailToClientOnboarding`.
   */
  async sendClientOnboardingEmail(email: string, password: string, companyName: string, portalUrl: string): Promise<void> {
    const html = `
<div style="margin:0;padding:0;background-color:#f4f6f8;font-family:Segoe UI,Roboto,Arial,sans-serif;">
  <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:650px;margin:40px auto;background:#ffffff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <tr>
      <td style="padding:25px 35px;background:#0b3d91;border-radius:8px 8px 0 0;color:#ffffff;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="left" valign="middle" style="width:35%;">
              <img src="https://admin.nexinev.com/assets/loginLogoD-Cs8OZH6W.png" alt="Nexin EV Logo" style="max-width:130px;height:auto;display:block;" />
            </td>
            <td align="right" valign="middle" style="width:70%;">
              <h2 style="margin:0;font-weight:540;font-size:20px;color:#ffffff;">Welcome to Nexin EV Charging Network</h2>
              <p style="margin:5px 0 0;font-size:13px;opacity:0.9;color:#e2e8f0;">Client Onboarding & Account Information</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:40px;color:#2d3748;font-size:15px;line-height:1.7;">
        <p>Dear <strong>Client Partner</strong>,</p>
        <p>
          We are pleased to inform you that your organization has been successfully onboarded to the
          <strong>Nexin EV Charging Central Management System (CSMS)</strong>.
          Your platform is now ready for managing charging stations, users, fleets, and transactions securely.
        </p>
        <table cellpadding="0" cellspacing="0" width="100%" style="margin:30px 0;background:#f7fafc;border:1px solid #e2e8f0;border-radius:6px;">
          <tr>
            <td style="padding:20px;">
              <h3 style="margin-top:0;margin-bottom:15px;color:#0b3d91;">🔐 Account Credentials</h3>
              <p style="margin:8px 0;"><strong>Organization Name:</strong> ${companyName}</p>
              <p style="margin:8px 0;"><strong>Portal URL:</strong>
                <a href="${portalUrl}" style="color:#0b3d91;text-decoration:none;">${portalUrl}</a>
              </p>
              <p style="margin:8px 0;"><strong>Login Email:</strong> ${email}</p>
              <p style="margin:8px 0;"><strong>Temporary Password:</strong> ${password}</p>
            </td>
          </tr>
        </table>
        <p style="margin-top:25px;">
          <strong>Security Notice:</strong><br/>
          For security reasons, you must reset your password immediately using the ‘Forgot Password’ option.
        </p>
        <p>
          If you require assistance with platform setup, charger integration, or operational training,
          our support team will be happy to assist you.
        </p>
        <p style="margin-top:30px;">We look forward to powering your EV infrastructure.</p>
        <p style="margin-top:30px;">
          Warm Regards,<br/>
          <strong>Nexin EV CSMS Operations Team</strong><br/>
          Email: support@nexinev.com<br/>
          Phone: +91 9666700566
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 40px;background:#f1f5f9;color:#64748b;font-size:12px;border-top:1px solid #e2e8f0;border-radius:0 0 8px 8px;">
        This is a system-generated email. Please do not reply to this message.<br/>
        © 2026 Nexin EV Technologies Pvt Ltd. All rights reserved.
      </td>
    </tr>
  </table>
</div>
        `;

    await this.sendEmail(email, 'Welcome to Nexin EV CSMS Platform 🚗⚡', 'NexinEv', html);
  }
}
