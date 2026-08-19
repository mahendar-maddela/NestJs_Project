import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AdminFleetVehicleGroupRepository } from '../repositories/admin-fleet-vehicle-group.repository';
import { CreateFleetVehicleGroupDto, UpdateFleetVehicleGroupDto } from '../dto/admin-fleet-vehicle-group.dto';

/** Mirrors `controllers/admin/fleet/vehiclegroupContoller.js`. */
@Injectable()
export class AdminFleetVehicleGroupService {
  constructor(private readonly repo: AdminFleetVehicleGroupRepository) {}

  async createFleetVehicleGroup(clientId: number, staffId: number, dto: CreateFleetVehicleGroupDto) {
    if (!dto.name || !dto.fleetId) {
      throw new BadRequestException({ success: false, message: 'Name and Fleet ID are required' });
    }

    const existingGroup = await this.repo.findByNameFleetClient(dto.name, dto.fleetId, clientId);
    if (existingGroup) {
      throw new BadRequestException({ success: false, message: 'Fleet vehicle group with this name already exists' });
    }

    const existingFleet = await this.repo.findFleetByIdAndClient(dto.fleetId, clientId);
    if (!existingFleet) {
      throw new NotFoundException({ success: false, message: 'Fleet not found' });
    }

    const currentGroupCount = await this.repo.countGroupsByFleet(dto.fleetId, clientId);
    if (existingFleet.noOfGroups !== null && currentGroupCount >= existingFleet.noOfGroups) {
      throw new BadRequestException({
        success: false,
        message: `Fleet has reached the maximum number of vehicle groups allowed (${existingFleet.noOfGroups})`,
      });
    }

    const groupCount = await this.repo.countGroupsByClient(clientId);

    const newGroup = await this.repo.createGroup({ name: dto.name, fleetId: existingFleet.id, staffId, clientId });

    const prefixConfigValue = await this.repo.findPrefixConfig(clientId);
    const groupIdFormat = `${prefixConfigValue?.vehicleGroup ?? ''}${(groupCount + 1).toString().padStart(5, '0')}`;
    await this.repo.updateGroupId(newGroup.id, groupIdFormat);

    return { success: true, message: 'Fleet vehicle group created successfully', data: { ...newGroup, groupId: groupIdFormat } };
  }

  async getAllFleetVehicleGroups(fleetId: number, clientId: number) {
    const groups = await this.repo.findGroupsByFleetAndClient(fleetId, clientId);
    return { success: true, message: 'Fleet vehicle groups fetched successfully', data: groups };
  }

  async updateFleetVehicleGroup(groupId: number, clientId: number, dto: UpdateFleetVehicleGroupDto) {
    const group = await this.repo.findByIdAndClient(groupId, clientId);
    if (!group) {
      throw new NotFoundException({ success: false, message: 'Fleet vehicle group not found' });
    }

    const updated = await this.repo.updateGroup(groupId, { name: dto.name ?? group.name });
    return { success: true, message: 'Fleet vehicle group updated successfully', data: updated };
  }

  async deleteFleetVehicleGroup(groupId: number, clientId: number) {
    const group = await this.repo.findByIdAndClientWithVehicles(groupId, clientId);
    if (!group) {
      throw new NotFoundException({ success: false, message: 'Fleet vehicle group not found' });
    }

    if (group.vehicles && group.vehicles.length > 0) {
      throw new BadRequestException({ success: false, message: 'Cannot delete group with assigned vehicles' });
    }

    await this.repo.deleteGroup(groupId);
    return { success: true, message: 'Fleet vehicle group deleted successfully' };
  }
}
