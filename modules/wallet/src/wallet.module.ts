import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from './entities/wallet.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { Credit } from './entities/credit.entity';
import { Vendor } from '../../vendors/src/entities/vendor.entity';
import { Charger } from '../../chargers/src/entities/charger.entity';

import { AdminWalletTransactionRepository } from './repositories/admin-wallet-transaction.repository';
import { AdminVendorCreditsRepository } from './repositories/admin-vendor-credits.repository';
import { AdminWalletTransactionService } from './services/admin-wallet-transaction.service';
import { AdminVendorCreditsService } from './services/admin-vendor-credits.service';
import { AdminWalletTransactionController } from './controllers/admin-wallet-transaction.controller';
import { AdminVendorCreditsController } from './controllers/admin-vendor-credits.controller';
import { WebWalletTransactionService } from './services/web-wallet-transaction.service';
import { WebWalletTransactionController } from './controllers/web-wallet-transaction.controller';
import { AppWalletTransactionService } from './services/app-wallet-transaction.service';
import { AppWalletTransactionController } from './controllers/app-wallet-transaction.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Wallet, WalletTransaction, Credit, Vendor, Charger])],
  controllers: [AdminWalletTransactionController, AdminVendorCreditsController, WebWalletTransactionController, AppWalletTransactionController],
  providers: [
    AdminWalletTransactionRepository,
    AdminVendorCreditsRepository,
    AdminWalletTransactionService,
    AdminVendorCreditsService,
    WebWalletTransactionService,
    AppWalletTransactionService,
  ],
  exports: [TypeOrmModule, AdminWalletTransactionRepository, AdminWalletTransactionService],
})
export class WalletModule {}
