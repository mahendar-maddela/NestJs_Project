import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PaymentTransaction } from './entities/payment-transaction.entity';
import { PaymentConfig } from './entities/payment-config.entity';
import { Transaction } from './entities/transaction.entity';
import { PayChargeQRCode } from './entities/pay-charge-qr-code.entity';
import { ClientDetails } from '../../clients/src/entities/client-details.entity';
import { Wallet } from '../../wallet/src/entities/wallet.entity';
import { WalletTransaction } from '../../wallet/src/entities/wallet-transaction.entity';
import { Coupon } from '../../users/src/entities/coupon.entity';
import { PrefixConfig } from '../../clients/src/entities/prefix-config.entity';
import { RoamingTariff } from '../../ocpi/src/entities/roaming-tariff.entity';

import { PaymentRepository } from './repositories/payment.repository';
import { PayChargeQrRepository } from './repositories/pay-charge-qr.repository';
import { AdminPaymentTransactionsRepository } from './repositories/admin-payment-transactions.repository';
import { SuperAdminTransactionsRepository } from './repositories/super-admin-transactions.repository';
import { AdminPaymentTransactionsService } from './services/admin-payment-transactions.service';
import { SuperAdminTransactionsService } from './services/super-admin-transactions.service';
import { WebhooksController } from './webhooks.controller';
import { SuperAdminTransactionsController } from './controllers/super-admin-transactions.controller';
import { AdminPaymentTransactionsController } from './controllers/admin-payment-transactions.controller';
import { RazorpayAdapter } from '@integrations/razorpay';
import { UserPaymentService } from './services/user-payment.service';
import { UserPaymentController } from './controllers/user-payment.controller';
import { PaymentWebhookService } from './services/payment-webhook.service';
import { QrPayChargeWebhookService } from './services/qr-pay-charge-webhook.service';
import { AdminPayChargeQrService } from './services/admin-pay-charge-qr.service';
import { AdminPayChargeQrController } from './controllers/admin-pay-charge-qr.controller';
import { QrRefundListenerService } from './services/qr-refund-listener.service';
import { ChargersModule } from '../../chargers/src/chargers.module';

@Module({
  imports: [
    forwardRef(() => ChargersModule),
    TypeOrmModule.forFeature([
      PaymentTransaction,
      PaymentConfig,
      Transaction,
      PayChargeQRCode,
      ClientDetails,
      Wallet,
      WalletTransaction,
      Coupon,
      PrefixConfig,
      RoamingTariff,
    ]),
  ],
  providers: [
    PaymentRepository,
    PayChargeQrRepository,
    AdminPaymentTransactionsRepository,
    SuperAdminTransactionsRepository,
    AdminPaymentTransactionsService,
    SuperAdminTransactionsService,
    RazorpayAdapter,
    UserPaymentService,
    PaymentWebhookService,
    QrPayChargeWebhookService,
    AdminPayChargeQrService,
    QrRefundListenerService,
  ],
  controllers: [
    WebhooksController,
    SuperAdminTransactionsController,
    AdminPaymentTransactionsController,
    UserPaymentController,
    AdminPayChargeQrController,
  ],
  exports: [
    TypeOrmModule,
    PaymentRepository,
    PayChargeQrRepository,
    AdminPaymentTransactionsRepository,
    SuperAdminTransactionsRepository,
    AdminPaymentTransactionsService,
    SuperAdminTransactionsService,
    RazorpayAdapter,
    QrPayChargeWebhookService,
  ],
})
export class PaymentsModule {}
