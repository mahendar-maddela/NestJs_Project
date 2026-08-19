import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { VendorUserRepository } from '../repositories/vendor-user.repository';

/** Mirrors `controllers/vendors/userController.js`. */
@Injectable()
export class VendorUserService {
  constructor(private readonly repo: VendorUserRepository) {}

  async getVendorUsers(vendorId: number, search: string | undefined, page: number, limit: number) {
    if (!vendorId) {
      throw new BadRequestException({ success: false, message: 'Vendor ID is required.' });
    }

    const skip = (page - 1) * limit;
    const { rows, raw, count } = await this.repo.findAndCountVendorUsers(vendorId, search, skip, limit);

    const userTypeIds = raw.map((r: any) => r.vu_userTypeId).filter(Boolean);
    const userTypeNames = await this.repo.findUserTypeNamesByIds(userTypeIds);

    const data = rows.map((user: any, i: number) => {
      const r = raw[i];
      return {
        ...user,
        userType: userTypeNames.get(r.vu_userTypeId) ?? 'Unknown',
        userVendorStatus: r.vu_status,
      };
    });

    return {
      success: true,
      message: 'Vendor users fetched successfully',
      data,
      pagination: { totalPages: Math.ceil(count / limit), page, totalItems: count },
    };
  }

  async getUserDeviceTransactions(userBusinessId: string, vendorId: number, page: number, limit: number) {
    const chargers = await this.repo.findChargerIdsByVendor(vendorId);
    if (chargers.length === 0) {
      throw new NotFoundException({ success: false, message: 'No chargers found for the vendor.' });
    }

    const user = await this.repo.findUserByBusinessId(userBusinessId);
    const skip = (page - 1) * limit;
    const { rows, count } = await this.repo.findAndCountUserDeviceTransactions(user?.id ?? -1, chargers.map((c) => c.id), skip, limit);

    return {
      success: true,
      message: 'User device transactions fetched successfully',
      data: rows,
      pagination: { totalPages: Math.ceil(count / limit), page },
    };
  }

  async getUserCreditTransactions(userBusinessId: string, vendorId: number, page: number, limit: number) {
    const user = await this.repo.findUserByBusinessId(userBusinessId);
    const credit = user ? await this.repo.findCreditByUserAndVendor(user.id, vendorId) : null;
    if (!credit) {
      throw new NotFoundException({ success: false, message: 'credit not found for user.' });
    }

    const chargers = await this.repo.findChargerIdsByVendor(vendorId);
    const skip = (page - 1) * limit;

    // Legacy's query references a `creditsId: vendorId` OR-leg and `creditWallet`/`vendor` includes
    // that don't exist on the WalletTransaction model (commented out) — the endpoint always 500s.
    // Implemented here against the associations that actually exist: `wallet`, filtered by this
    // credit's chargers or its own creditsId.
    const { rows, count } = await this.repo.findAndCountCreditWalletTransactions(chargers.map((c) => c.id), vendorId, credit.id, skip, limit);

    return {
      success: true,
      message: 'User credit transactions fetched successfully',
      data: rows,
      pagination: { totalPages: Math.ceil(count / limit), page },
    };
  }

  async getUserTypeById(userBusinessId: string, vendorId: number) {
    const user = await this.repo.findUserByBusinessId(userBusinessId);
    if (!user) {
      throw new NotFoundException({ success: false, message: 'User not found.' });
    }

    const vendorUser = await this.repo.findVendorUserByUserIdAndVendor(user.id, vendorId);
    return { success: true, message: 'User credit transactions fetched successfully', data: vendorUser };
  }

  async vendorUserStatusUpdate(userBusinessId: string, vendorId: number, status: string) {
    // Legacy queries `VendorUser.userId = req.params.id` directly (the raw route param) rather than
    // resolving it through User first, unlike the other endpoints in this controller — preserved as-is.
    const vendorUser = await this.repo.findVendorUserByUserIdAndVendor(Number(userBusinessId), vendorId);
    if (!vendorUser) {
      throw new NotFoundException({ success: false, message: 'User not found.' });
    }
    await this.repo.updateVendorUserStatus(vendorUser.id, status);
    return { success: true, message: 'User status updated successfully' };
  }

  async getAllUserForDropdown(clientId: number, userId: string | undefined) {
    const users = await this.repo.findUsersForDropdown(clientId, userId);
    return { success: true, message: 'Users fetched successfully', data: users };
  }

  async getUserRfidTags(userId: number, vendorId: number) {
    const rfidTags = await this.repo.findRfidTagsByUserAndVendor(userId, vendorId);
    return { success: true, message: 'RFID tags fetched successfully', data: rfidTags };
  }
}
