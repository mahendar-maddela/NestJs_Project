import { Injectable, NotFoundException } from '@nestjs/common';
import { AdminFleetUserRepository } from '../repositories/admin-fleet-user.repository';
import { AuditLogRepository } from '../../../super-admin/src/repositories/audit-log.repository';
import { EmployeeRepository } from '../../../super-admin/src/repositories/employee.repository';
import { SuperAdminFleetUserStatusUpdateDto } from '../dto/super-admin-fleet.dto';

/** Mirrors `controllers/suparAdmin/fleet/fleetUserController.js`. Cross-client: clientId, when present, always comes from the query/route, never an authenticated actor. */
@Injectable()
export class SuperAdminFleetUserService {
  constructor(
    private readonly repo: AdminFleetUserRepository,
    private readonly auditLogRepo: AuditLogRepository,
    private readonly employeeRepo: EmployeeRepository,
  ) {}

  async getAllClientFleetUsers(clientId: number | undefined, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [rows, count] = await this.repo.findAndCountFleetUserDetailsCrossClient(clientId, skip, limit);

    return {
      success: true,
      message: 'Fleet users fetched successfully',
      data: rows,
      pagination: { total: count, totalPages: Math.ceil(count / limit), currentPage: page },
    };
  }

  async getFleetUserById(fleetUserId: number) {
    const fleetUserDetail = await this.repo.findFleetUserDetailWithWalletCrossClient(fleetUserId);
    if (!fleetUserDetail) {
      throw new NotFoundException({ success: false, message: 'Fleet user not found' });
    }
    return { success: true, message: 'Fleet user details fetched successfully', data: fleetUserDetail };
  }

  async updateFleetUserStatus(fleetUserId: number, superAdminId: number, dto: SuperAdminFleetUserStatusUpdateDto) {
    const employee = await this.employeeRepo.findById(superAdminId);

    const fleet = await this.repo.findFleetUserDetailByIdOnly(fleetUserId);
    if (!fleet) {
      throw new NotFoundException({ success: false, message: 'Fleet not found.' });
    }

    const oldStatus = fleet.status;
    if (oldStatus === dto.status) {
      return { success: true, message: 'Fleet status is already up to date.' };
    }

    await this.repo.updateFleetUserDetailStatus(fleet.id, fleet.clientId, dto.status);

    if (dto.status === 'Block') {
      await this.repo.bulkUpdateFleetUsersStatusByFleet(fleet.id, 'Active', 'InActive', fleet.clientId);
      await this.repo.bulkDisableVehicleAutoChargeByFleet(fleet.id, fleet.clientId);
      await this.repo.expireActiveRfidTagsByFleet(fleet.id, fleet.clientId);
    }

    if (dto.status === 'Active') {
      await this.repo.bulkUpdateFleetUsersStatusByFleet(fleet.id, 'InActive', 'Active', fleet.clientId);
    }

    // Legacy dereferences `employee.id` unconditionally (no null check) — preserved, since the
    // authenticated super-admin JWT already guarantees this record exists in practice.
    await this.auditLogRepo.createLog({
      employeeId: employee!.id,
      clientId: fleet.clientId,
      module: 'Fleet',
      action: 'UPDATE_STATUS',
      entityId: String(fleet.id),
      entityName: fleet.cName ?? undefined,
      field: 'status',
      oldValue: { status: oldStatus },
      newValue: { status: dto.status },
      comment: `${employee?.name || 'System'} changed the status of fleet for "${fleet.cName}" from ${oldStatus} to ${dto.status}.`,
    });

    return { success: true, message: `Fleet status updated to ${dto.status} successfully.` };
  }
}
