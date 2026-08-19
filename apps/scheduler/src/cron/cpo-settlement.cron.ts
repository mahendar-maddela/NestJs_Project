import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { getYesterdayRangeIstToUtc } from '@app/common';
import { CpoSettlementRepository } from '../repositories/cpo-settlement.repository';

/** Mirrors `settlements` (daily 00:05 IST) in legacy `utils/cronJob.js` -> `cpoSettlementController.js:generateCpoSettlement`. */
@Injectable()
export class CpoSettlementCron {
  private readonly logger = new Logger(CpoSettlementCron.name);

  constructor(private readonly repo: CpoSettlementRepository) {}

  @Cron('5 0 * * *', { timeZone: 'Asia/Kolkata' })
  async handleGenerateSettlements(): Promise<void> {
    this.logger.log('Starting CPO settlement generation at 12:05 AM IST...');
    try {
      const { startDate: fromDate, endDate: toDate } = getYesterdayRangeIstToUtc();
      const vendors = await this.repo.findAllVendors();

      for (const vendor of vendors) {
        const chargers = await this.repo.findChargersByVendor(vendor.id);

        for (const charger of chargers) {
          const transactions = await this.repo.findSuccessfulTransactions(charger.id, fromDate, toDate);
          if (!transactions.length) continue;

          const totalAmount = transactions.reduce((sum, txn) => sum + parseFloat(String(txn.price || 0)), 0);
          const transactionFeePerc = parseFloat(vendor.transFeePerc || '0') || 0;
          const transactionFee = transactionFeePerc > 0 ? (totalAmount * transactionFeePerc) / 100 : 0;
          const extraFee = 0;
          const platformFee = 0;
          const netPayble = totalAmount - transactionFee - platformFee - extraFee;

          if (totalAmount <= 0 && netPayble <= 0) continue;

          const existingSettlement = await this.repo.findExistingSettlement(vendor.id, charger.id, fromDate, toDate);
          if (existingSettlement) continue;

          await this.repo.createSettlement({
            vendorId: vendor.id,
            chargerId: charger.id,
            clientId: charger.clientId || vendor.clientId,
            fromDate,
            toDate,
            platformFee: platformFee.toFixed(2),
            extraFee: extraFee.toFixed(2),
            totalAmount: totalAmount.toFixed(2),
            transactionFee: transactionFee.toFixed(2),
            netPayble: netPayble.toFixed(2),
            status: 'Due',
          });
        }

        this.logger.log(`Settlement created for Vendor ${vendor.vendor_name}`);
      }

      this.logger.log('All CPO settlements generated successfully.');
    } catch (error: any) {
      this.logger.error(`Error generating CPO settlements: ${error.message}`);
    }
  }
}
