import { Controller, Post, Req, Res, HttpStatus, Logger, Param } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { RazorpayAdapter } from '@integrations/razorpay';
import { PaymentWebhookService } from './services/payment-webhook.service';
import { QrPayChargeWebhookService } from './services/qr-pay-charge-webhook.service';

@Controller()
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly razorpayAdapter: RazorpayAdapter,
    private readonly paymentWebhookService: PaymentWebhookService,
    private readonly qrPayChargeWebhookService: QrPayChargeWebhookService,
  ) {}

  /** Mirrors `controllers/APP/paymentGatewayController.js:verifyPaymentTransaction`. */
  @Post('v1/:nexin/webhook')
  async handleGenericWebhook(
    @Param('nexin') nexinParam: string,
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
  ) {
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const signature = (req.headers['x-razorpay-signature'] as string) || '';
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    this.logger.log(`Received incoming webhook on route v1/${nexinParam}/webhook`);

    if (!signature) {
      return res.status(HttpStatus.BAD_REQUEST).send({ success: false, message: 'Missing webhook signature' });
    }
    if (!webhookSecret) {
      this.logger.error('RAZORPAY_WEBHOOK_SECRET is not configured');
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ success: false, message: 'Webhook not configured' });
    }
    if (!this.razorpayAdapter.verifyWebhookSignature({ rawBody, signature, secret: webhookSecret })) {
      this.logger.warn('⚠️ Webhook signature verification failed');
      return res.status(HttpStatus.BAD_REQUEST).send({ success: false, message: 'Invalid webhook signature' });
    }

    const payload = req.body as Record<string, any>;
    const paymentEntity = payload?.payload?.payment?.entity;
    if (!paymentEntity) {
      return res.status(HttpStatus.BAD_REQUEST).send({ success: false, message: 'Invalid webhook payload' });
    }

    const result = await this.paymentWebhookService.processPaymentWebhook(paymentEntity, nexinParam);
    return res.status(result.status).send(result.body);
  }

  /** Mirrors `OCPP/payAndChargeFeature/payAndChargeHandler.js:handlePayAndChargeWebhook`. */
  @Post('v1/qr/:brandName/webhook/razorpay')
  async handleQrPayWebhook(
    @Param('brandName') brandName: string,
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
  ) {
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const signature = (req.headers['x-razorpay-signature'] as string) || '';
    const secret = process.env.QRPAYCHARGE_WEBHOOK_SECRET;

    this.logger.log(`Received QR Pay Charge webhook for brand: ${brandName}`);

    if (!signature) {
      return res.status(HttpStatus.BAD_REQUEST).send({ success: false, message: 'Missing webhook signature' });
    }
    if (!secret) {
      this.logger.error('QRPAYCHARGE_WEBHOOK_SECRET is not configured');
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ success: false, message: 'Webhook not configured' });
    }
    // if (!this.razorpayAdapter.verifyWebhookSignature({ rawBody, signature, secret })) {
    //   this.logger.warn('⚠️ QR Webhook signature verification failed');
    //   return res.status(HttpStatus.BAD_REQUEST).send({ success: false, message: 'Invalid webhook signature' });
    // }

    const payload = req.body as Record<string, any>;
    const result = await this.qrPayChargeWebhookService.processWebhook(payload, brandName);
    return res.status(result.status).send(result.body);
  }
}
