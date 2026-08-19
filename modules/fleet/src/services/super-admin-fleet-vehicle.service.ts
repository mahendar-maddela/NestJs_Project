import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AdminFleetVehicleRepository } from '../repositories/admin-fleet-vehicle.repository';
import { AuditLogRepository } from '../../../super-admin/src/repositories/audit-log.repository';
import { EmployeeRepository } from '../../../super-admin/src/repositories/employee.repository';
import { SuperAdminVehicleAutoChargeUpdateDto } from '../dto/super-admin-fleet.dto';

/** Mirrors `controllers/suparAdmin/fleet/vehicleController.js`. */
@Injectable()
export class SuperAdminFleetVehicleService {
  constructor(
    private readonly repo: AdminFleetVehicleRepository,
    private readonly auditLogRepo: AuditLogRepository,
    private readonly employeeRepo: EmployeeRepository,
  ) {}

  async getVehiclesByGroupId(groupId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [vehicles, count] = await this.repo.findAndCountByGroupCrossClient(groupId, skip, limit);

    return {
      success: true,
      message: 'Vehicles fetched successfully',
      data: vehicles,
      pagination: { total: count, totalPages: Math.ceil(count / limit), currentPage: page, limit },
    };
  }

  async updateAutoChargeOfVehicleById(id: number, superAdminId: number, dto: SuperAdminVehicleAutoChargeUpdateDto) {
    const vehicle = await this.repo.findByIdOnly(id);
    if (!vehicle) {
      throw new NotFoundException({ success: false, message: 'Vehicle not found.' });
    }

    const employee = await this.employeeRepo.findById(superAdminId);
    const oldAutoCharge = vehicle.autoCharge;

    if (dto.autoCharge) {
      const fleet = await this.repo.findFleetByIdAndClient(vehicle.fleetId!, vehicle.clientId);
      if (!fleet) {
        throw new NotFoundException({ success: false, message: 'Fleet not found.' });
      }
      if (fleet.status === 'Block') {
        throw new BadRequestException({ success: false, message: 'AutoCharge cannot be enabled because the fleet is blocked.' });
      }
    }

    await this.repo.updateVehicle(vehicle.id, { autoCharge: dto.autoCharge });

    // Legacy dereferences `employee.id` unconditionally (no null check) — preserved, since the
    // authenticated super-admin JWT already guarantees this record exists in practice.
    await this.auditLogRepo.createLog({
      employeeId: employee!.id,
      clientId: vehicle.clientId,
      module: 'Vehicle',
      action: 'UPDATE_AUTOCHARGE',
      entityId: String(vehicle.id),
      entityName: vehicle.regNo ?? undefined,
      field: 'autoCharge',
      oldValue: { autoCharge: oldAutoCharge },
      newValue: { autoCharge: dto.autoCharge },
      comment: `${employee?.name || 'System'} ${dto.autoCharge ? 'enabled' : 'disabled'} AutoCharge for vehicle ${vehicle.regNo} from ${oldAutoCharge ? 'Enabled' : 'Disabled'} to ${dto.autoCharge ? 'Enabled' : 'Disabled'}.`,
    });

    return { success: true, message: 'AutoCharge updated successfully.', data: { id: vehicle.id, autoCharge: dto.autoCharge } };
  }
}
