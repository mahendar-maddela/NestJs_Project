import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AdminFleetVehicleGroupRepository } from '../repositories/admin-fleet-vehicle-group.repository';
import { AdminFleetVehicleRepository } from '../repositories/admin-fleet-vehicle.repository';
import { CreateFleetVehicleGroupDto, UpdateFleetVehicleGroupDto } from '../dto/fleet-vehicle-group.dto';

/** Mirrors `controllers/Fleet/vehicleGroupController.js`. */
@Injectable()
export class FleetVehicleGroupService {
  constructor(
    private readonly repo: AdminFleetVehicleGroupRepository,
    private readonly vehicleRepo: AdminFleetVehicleRepository,
  ) {}

  async createFleetVehicleGroup(fleetId: number, clientId: number, dto: CreateFleetVehicleGroupDto) {
    const fleet = await this.repo.findFleetByIdAndClient(fleetId, clientId);
    if (!fleet) {
      throw new NotFoundException({ message: 'Fleet not found' });
    }

    const currentGroupCount = await this.repo.countGroupsByFleet(fleetId, clientId);
    if (fleet.noOfGroups !== null && currentGroupCount >= fleet.noOfGroups) {
      throw new BadRequestException({ message: 'Maximum number of Groups reached for this fleet' });
    }

    const groupCount = await this.repo.countGroupsByClient(clientId);
    const newGroup = await this.repo.createGroup({ fleetId, name: dto.groupName, clientId });

    const prefixConfigValue = await this.repo.findPrefixConfig(clientId);
    const groupIdFormat = `${prefixConfigValue?.vehicleGroup ?? ''}${(groupCount + 1).toString().padStart(5, '0')}`;
    await this.repo.updateGroupId(newGroup.id, groupIdFormat);

    return { success: true, message: 'Fleet vehicle group created successfully', data: { ...newGroup, groupId: groupIdFormat } };
  }

  async getAllFleetVehicleGroups(fleetId: number, clientId: number, page: number, limit: number, search?: string) {
    const skip = (page - 1) * limit;
    const [rows, count] = await this.repo.findAndCountByFleetClientSearch(fleetId, clientId, search, skip, limit);

    return {
      success: true,
      message: 'Fleet vehicle groups fetched successfully',
      data: rows,
      pagination: { totalRecords: count, currentPage: page, totalPages: Math.ceil(count / limit), pageSize: limit },
    };
  }

  async updateFleetVehicleGroup(groupId: number, fleetId: number, clientId: number, dto: UpdateFleetVehicleGroupDto) {
    const group = await this.repo.findByIdFleetClient(groupId, fleetId, clientId);
    if (!group) {
      throw new NotFoundException({ success: false, message: 'Fleet vehicle group not found' });
    }

    const updated = await this.repo.updateGroup(groupId, { name: dto.name ?? group.name });
    return { success: true, message: 'Fleet vehicle group updated successfully', data: updated };
  }

  async deleteFleetVehicleGroup(groupId: number, fleetId: number, clientId: number) {
    const group = await this.repo.findByIdFleetClientWithVehicles(groupId, fleetId, clientId);
    if (!group) {
      throw new NotFoundException({ success: false, message: 'Fleet vehicle group not found' });
    }

    if (group.vehicles && group.vehicles.length > 0) {
      throw new BadRequestException({ success: false, message: 'Cannot delete group with assigned vehicles' });
    }

    await this.repo.deleteGroup(groupId);
    return { success: true, message: 'Fleet vehicle group deleted successfully' };
  }

  async groupIdByVehicle(groupId: number, fleetId: number, clientId: number) {
    const vehicles = await this.vehicleRepo.findAllByGroupFleetClient(groupId, fleetId, clientId);
    return { success: true, message: 'Vehicles fetched successfully', data: vehicles };
  }

  async groupById(id: number, fleetId: number, clientId: number) {
    const group = await this.repo.findByIdFleetClient(id, fleetId, clientId);
    if (!group) {
      throw new NotFoundException({ success: false, message: 'Group not found' });
    }
    return { success: true, message: 'Group fetched successfully', data: group };
  }
}
