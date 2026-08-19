import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminUserRepository } from '../repositories/admin-user.repository';
import { UserStatus } from 'database/src';
import { Wallet } from '../../../wallet/src/entities/wallet.entity';
import { WalletTransaction } from '../../../wallet/src/entities/wallet-transaction.entity';
import { Like } from 'typeorm';

@Injectable()
export class AdminUserService {
  constructor(private readonly adminUserRepository: AdminUserRepository) {}

  async getAllUsers(query: any, clientId: number) {
    const page = query.page ? Number(query.page) : undefined;
    const limit = query.limit ? Number(query.limit) : undefined;
    const search = query.search || '';

    if (!page && !limit) {
      const { users } = await this.adminUserRepository.findSimpleUsers(clientId);
      return {
        success: true,
        message: 'Users fetched successfully',
        data: users,
      };
    }

    const whereCondition = search
      ? [
          { clientId, first_name: Like(`%${search}%`) },
          { clientId, last_name: Like(`%${search}%`) },
          { clientId, email: Like(`%${search}%`) },
          { clientId, phone: Like(`%${search}%`) },
          { clientId, userId: Like(`%${search}%`) },
        ]
      : { clientId };

    const currentPage = page || 1;
    const currentLimit = limit || 10;
    const skip = (currentPage - 1) * currentLimit;

    const { count, rows } = await this.adminUserRepository.findPaginatedUsers(whereCondition, skip, currentLimit);


    return {
      success: true,
      message: 'Users fetched successfully',
      data: rows,
      pagination: {
        totalPages: Math.ceil(count / currentLimit),
        page: currentPage,
      },
    };
  }

  async getUserById(id: number, clientId: number) {
    const user = await this.adminUserRepository.findUserByIdAndClient(id, clientId);
    if (!user) {
      throw new NotFoundException({ message: 'User not found' });
    }

    return {
      success: true,
      message: 'User fetched successfully',
      data: user,
    };
  }

  async updateUser(id: number, body: any, clientId: number) {
    const user = await this.adminUserRepository.findUserByIdAndClient(id, clientId);
    if (!user) {
      throw new NotFoundException({ message: 'User not found' });
    }

    const updated = await this.adminUserRepository.updateUser(id, {
      ...(body.first_name ? { first_name: body.first_name } : {}),
      ...(body.last_name ? { last_name: body.last_name } : {}),
      ...(body.email ? { email: body.email } : {}),
      ...(body.phone ? { phone: body.phone } : {}),
      ...(body.pan ? { pan: body.pan } : {}),
      ...(body.gst ? { gst: body.gst } : {}),
      ...(body.appName ? { appName: body.appName } : {}),
    });

    return {
      success: true,
      message: 'User updated successfully',
      data: updated,
    };
  }

  async deleteUser(id: number, clientId: number) {
    const user = await this.adminUserRepository.findUserByIdAndClient(id, clientId);
    if (!user) {
      throw new NotFoundException({ message: 'User not found' });
    }

    await this.adminUserRepository.deleteUser(id);

    return {
      success: true,
      message: 'User deleted successfully',
    };
  }

  async userStatusUpdate(id: number, status: string, clientId: number) {
    const user = await this.adminUserRepository.findUserByIdAndClient(id, clientId);
    if (!user) {
      throw new NotFoundException({ message: 'User not found' });
    }

    if (!UserStatus.includes(status as (typeof UserStatus)[number])) {
      throw new BadRequestException({ message: 'Invalid status' });
    }

    const updated = await this.adminUserRepository.updateUserStatus(id, status as UserStatus);

    return {
      success: true,
      message: 'User status updated successfully',
      data: updated,
    };
  }

  async getUserDeviceTransactions(id: number, query: any, clientId: number) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 200;
    const skip = (page - 1) * limit;
    const chargerId = query.chargerId ? Number(query.chargerId) : undefined;

    const where: any = { userId: id };
    if (chargerId) {
      where.chargerRef = chargerId;
    }

    const { count, rows } = await this.adminUserRepository.findDeviceTransactions(where, skip, limit, !chargerId);

    return {
      success: true,
      message: 'User device transactions fetched successfully',
      transactions: rows,
      pagination: {
        totalPages: Math.ceil(count / limit),
        page,
      },
    };
  }

  async getUserWalletTransactions(id: number, query: any, clientId: number) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 200;
    const skip = (page - 1) * limit;

    const wallet = await this.adminUserRepository.findUserWallet(id, clientId);
    if (!wallet) {
      throw new NotFoundException({ success: false, message: 'Wallet not found for this user' });
    }

    const { count, rows } = await this.adminUserRepository.findWalletTransactions(wallet.id, clientId, skip, limit);

    return {
      success: true,
      message: 'User wallet transactions fetched successfully',
      data: rows,
      pagination: {
        totalPages: Math.ceil(count / limit),
        page,
      },
    };
  }

  async getUserRfidTags(id: number, query: any, clientId: number) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 200;
    const skip = (page - 1) * limit;

    const { count, rows } = await this.adminUserRepository.findUserRfidTags(id, clientId, skip, limit);

    return {
      success: true,
      message: 'User RFID tags fetched successfully',
      data: rows,
      pagination: {
        totalPages: Math.ceil(count / limit),
        page,
      },
    };
  }

  async getUserVendor(id: number, clientId: number) {
    const vendors = await this.adminUserRepository.findUserVendors(id, clientId);

    return {
      success: true,
      message: 'User vendors fetched successfully',
      data: vendors,
    };
  }

  async getUserPayments(id: number, query: any, clientId: number) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 200;
    const skip = (page - 1) * limit;

    const { count, rows } = await this.adminUserRepository.findUserPayments(id, clientId, skip, limit);

    return {
      success: true,
      message: 'User payments fetched successfully',
      data: rows,
      pagination: {
        page,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  async getUserVehiclesById(id: number, clientId: number) {
    const vehicles = await this.adminUserRepository.findUserVehicles(id, clientId);

    return {
      success: true,
      message: 'User vehicles fetched successfully',
      data: vehicles,
    };
  }

  async updateUserVehicleAutoCharge(body: any, clientId: number) {
    const { userId, vehicleId, autoCharge } = body;

    const vehicle = await this.adminUserRepository.findVehicleByIdUserAndClient(
      Number(vehicleId),
      Number(userId),
      clientId,
    );

    if (!vehicle) {
      throw new NotFoundException({ success: false, message: 'Vehicle not found' });
    }

    await this.adminUserRepository.updateVehicleAutoCharge(vehicle.id, Boolean(autoCharge));

    return {
      success: true,
      message: 'Vehicle auto charge updated successfully',
    };
  }

  async handleUserWalletBalance(body: any, staffId: number, clientId: number) {
    const { userId, amount, note, type = 'Credit' } = body;

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      throw new BadRequestException({ success: false, message: 'Invalid amount' });
    }

    if (!userId) {
      throw new BadRequestException({ success: false, message: 'userId is required' });
    }

    const user = await this.adminUserRepository.findUserByStringIdAndClient(String(userId), clientId);
    if (!user) {
      throw new NotFoundException({ success: false, message: 'User not found' });
    }

    const clientPrefix = await this.adminUserRepository.findPrefixConfig(clientId);
    const prefix = clientPrefix?.wallet || 'WAL';

    await this.adminUserRepository.createUserTransaction(async (manager) => {
      const walletRepo = manager.getRepository(Wallet);
      const walletTransactionRepo = manager.getRepository(WalletTransaction);

      let wallet = await walletRepo.findOne({ where: { userId: user.id, type: 'User', clientId } });

      if (!wallet) {
        wallet = await walletRepo.save(walletRepo.create({ userId: user.id, type: 'User', balance: 0, clientId }));
      }

      let newBalance = wallet.balance || 0;
      if (type === 'Debit') {
        newBalance -= numericAmount;
      } else {
        newBalance += numericAmount;
      }

      await walletRepo.update({ id: wallet.id }, { balance: newBalance });

      let refNo = '';
      let exists = true;
      while (exists) {
        const randomSeven = Math.floor(1000000 + Math.random() * 9000000);
        refNo = `${prefix}${randomSeven}A`;
        const found = await walletTransactionRepo.findOne({ where: { refNo } });
        if (!found) exists = false;
      }

      const parsedType = type === 'Debit' ? 'Debit' : 'Credit';

      await walletTransactionRepo.save(
        walletTransactionRepo.create({
          type: parsedType,
          refNo,
          amount: numericAmount,
          walletId: wallet.id,
          staffId,
          transactionPurpose: 'Credits',
          sourceType: 'Wallet',
          remainingBalance: newBalance,
          userType: 'User',
          note: note || (type === 'Debit' ? 'Admin debited the credit' : 'Admin added the credit'),
          clientId,
        }),
      );
    });

    return {
      success: true,
      message: `Wallet ${type.toLowerCase()}ed successfully`,
    };
  }
}
