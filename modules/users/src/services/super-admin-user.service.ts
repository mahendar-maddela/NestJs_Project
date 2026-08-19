import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SuperAdminUserRepository } from '../repositories/super-admin-user.repository';
import { AuditLogRepository } from '../../../super-admin/src/repositories/audit-log.repository';
import { EmployeeRepository } from '../../../super-admin/src/repositories/employee.repository';
import { SuperAdminUserQueryDto, UpdateAutoChargeDto, UpdateUserStatusDto } from '../dto/super-admin-user.dto';

/** Mirrors `controllers/suparAdmin/userController.js`. */
@Injectable()
export class SuperAdminUserService {
  constructor(
    private readonly repo: SuperAdminUserRepository,
    private readonly auditLogRepo: AuditLogRepository,
    private readonly employeeRepo: EmployeeRepository,
  ) {}

  async getAllClientsUsers(query: SuperAdminUserQueryDto) {
    if (!query.page && !query.limit) {
      const users = await this.repo.findAllSimple();
      return { success: true, message: 'Users fetched successfully', data: users };
    }

    const page = parseInt(query.page ?? '', 10);
    const limit = parseInt(query.limit ?? '', 10);
    const skip = (page - 1) * limit;

    const [rows, count] = await this.repo.findAndCountPaginated(query.clientId ? Number(query.clientId) : undefined, query.search, skip, limit);

    return {
      success: true,
      message: 'Users fetched successfully',
      data: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    };
  }

  async getClientUserById(userId: number) {
    const user = await this.repo.findByIdExcludingPassword(userId);
    if (!user) {
      throw new NotFoundException({ success: false, message: 'User not found' });
    }
    return { success: true, message: 'User fetched successfully', data: user };
  }

  async getUserPaymentsById(userId: number, page: number, limit: number) {
    const user = await this.repo.findByIdSimple(userId);
    if (!user) {
      throw new NotFoundException({ success: false, message: 'User not found' });
    }

    const skip = (page - 1) * limit;
    const [rows, count] = await this.repo.findAndCountPayments(userId, skip, limit);

    return {
      success: true,
      message: 'User payments fetched successfully',
      data: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    };
  }

  async getWalletTransactionsById(userId: number, page: number, limit: number) {
    const wallet = await this.repo.findUserWallet(userId);
    if (!wallet) {
      throw new NotFoundException({ success: false, message: 'Wallet not found for this user' });
    }

    const skip = (page - 1) * limit;
    const [rows, count] = await this.repo.findAndCountWalletTransactions(wallet.id, skip, limit);

    return {
      success: true,
      message: 'User wallet transactions fetched successfully',
      data: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    };
  }

  async getChargingSessionById(userId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [rows, count] = await this.repo.findAndCountDeviceTransactions(userId, skip, limit);

    return {
      success: true,
      message: 'User device transactions fetched successfully',
      data: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    };
  }

  async getRfidTagsByUserId(userId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [rows, count] = await this.repo.findAndCountRfidTags(userId, skip, limit);

    return {
      success: true,
      message: 'User RFID tags fetched successfully',
      data: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    };
  }

  async getCposByUserId(userId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [rows, count] = await this.repo.findAndCountVendorUsers(userId, skip, limit);

    return {
      success: true,
      message: 'User vendors fetched successfully',
      data: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    };
  }

  async getUserVehicleById(userId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [rows, count] = await this.repo.findAndCountVehicles(userId, skip, limit);

    return {
      success: true,
      message: 'User vehicles fetched successfully',
      data: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    };
  }

  async updateAutoChargeOfVehicle(vehicleId: number, dto: UpdateAutoChargeDto) {
    if (typeof dto.isAutoChargeEnabled !== 'boolean') {
      throw new BadRequestException({ success: false, message: 'isAutoChargeEnabled must be a boolean value' });
    }

    const vehicle = await this.repo.findVehicleByIdAndUser(vehicleId, dto.userId);
    if (!vehicle) {
      throw new NotFoundException({ success: false, message: 'Vehicle not found' });
    }

    await this.repo.updateVehicleAutoCharge(vehicle.id, dto.isAutoChargeEnabled);

    return { success: true, message: 'Auto charge updated successfully', data: { vehicleId: vehicle.id, autoCharge: dto.isAutoChargeEnabled } };
  }

  async updateUserStatus(userId: number, superAdminId: number, dto: UpdateUserStatusDto) {
    const user = await this.repo.findByIdSimple(userId);
    const employee = await this.employeeRepo.findById(superAdminId);

    if (!user) {
      throw new NotFoundException({ success: false, message: 'User not found' });
    }

    const oldStatus = user.status;
    if (oldStatus === dto.status) {
      return { success: true, message: 'User status is already up to date', data: user };
    }

    await this.repo.updateUser(userId, { status: dto.status as any });

    // Legacy dereferences `employee.id` unconditionally (no null check) — preserved, since the
    // authenticated super-admin JWT already guarantees this record exists in practice.
    await this.auditLogRepo.createLog({
      employeeId: employee!.id,
      module: 'User',
      action: 'UPDATE_STATUS',
      entityId: String(user.id),
      entityName: `${user.first_name} ${user.last_name || ''}`,
      field: 'status',
      clientId: user.clientId,
      oldValue: { status: oldStatus },
      newValue: { status: dto.status },
      comment: `${employee?.name || 'System'} changed the status of user ${user.first_name} ${user.last_name || ''} from ${oldStatus} to ${dto.status}.`,
    });

    return { success: true, message: 'User status updated successfully', data: { ...user, status: dto.status } };
  }
}
