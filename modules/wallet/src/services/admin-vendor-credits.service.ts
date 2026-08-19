import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AdminVendorCreditsRepository } from '../repositories/admin-vendor-credits.repository';
import { AddVendorCreditsDto } from '../dto/admin-vendor-credits.dto';

/** Mirrors `controllers/admin/vendorCreaditsController.js`. */
@Injectable()
export class AdminVendorCreditsService {
  constructor(private readonly repo: AdminVendorCreditsRepository) {}

  async getVendorStaffWalletTransactions(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [rows, count] = await this.repo.findAndCountStaffWalletTransactions(skip, limit);

    return {
      success: true,
      message: 'Vendor staff wallet transactions fetched successfully',
      data: rows,
      pagination: { totalPages: Math.ceil(count / limit), page },
    };
  }

  async addCreditsToVendor(clientId: number, staffId: number, dto: AddVendorCreditsDto) {
    const amount = Number(dto.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new BadRequestException({ success: false, message: 'Invalid amount' });
    }

    return this.repo.runInTransaction(async ({ vendor: vendorRepo, wallet: walletRepo, walletTransaction: walletTransactionRepo }) => {
      const vendor = await vendorRepo.findOne({ where: { id: dto.vendorId } });
      if (!vendor) {
        throw new NotFoundException({ success: false, message: 'Vendor not found' });
      }

      const wallet = await walletRepo.findOne({ where: { vendorId: dto.vendorId, type: 'Vendor' } });
      const newBalance = (wallet?.balance || 0) + amount;
      await walletRepo.update(wallet!.id, { balance: newBalance });

      const lastTransaction = await walletTransactionRepo.findOne({ order: { id: 'DESC' }, select: { id: true, refNo: true } });
      let refNo: string;
      const lastRefNumber = lastTransaction?.refNo ? parseInt(lastTransaction.refNo.replace('SV', ''), 10) : NaN;
      if (lastTransaction?.refNo && !isNaN(lastRefNumber)) {
        refNo = 'SV' + (lastRefNumber + 1);
      } else {
        refNo = 'SV1000001';
      }

      await walletTransactionRepo.save(
        walletTransactionRepo.create({
          type: 'Credit',
          refNo,
          amount,
          walletId: wallet!.id,
          staffId,
          note: dto.note,
          userType: 'Vendor',
          transactionPurpose: 'Credits',
          sourceType: 'Wallet',
          remainingBalance: newBalance,
          // Legacy omits clientId here, which violates the column's NOT NULL constraint and always
          // throws at runtime; supplying the tenant's clientId is the fix, not a behavior change.
          clientId,
        }),
      );

      return { success: true, message: 'Credits added successfully', data: vendor };
    });
  }
}
