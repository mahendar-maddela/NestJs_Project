import { Injectable, NotFoundException } from '@nestjs/common';
import { AdminFleetVehicleGroupRepository } from '../repositories/admin-fleet-vehicle-group.repository';

/** Mirrors `controllers/suparAdmin/fleet/vehiclegroupContoller.js`. */
@Injectable()
export class SuperAdminFleetVehicleGroupService {
  constructor(private readonly repo: AdminFleetVehicleGroupRepository) {}

  async getAllVehicleGroupsByFleet(fleetId: number) {
    const groups = await this.repo.findGroupsByFleetCrossClient(fleetId);
    return { success: true, message: 'Fleet vehicle groups fetched successfully', data: groups };
  }

  async getGroupDetailById(groupId: number) {
    const group = await this.repo.findByIdCrossClient(groupId);
    if (!group) {
      throw new NotFoundException({ success: false, message: 'Group not found' });
    }
    return { success: true, message: 'Group fetched successfully', data: group };
  }
}
