import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AdminFleetVehicleGroupRepository } from '../repositories/admin-fleet-vehicle-group.repository';
import { CreateVendorFleetVehicleGroupDto, UpdateVendorFleetVehicleGroupDto } from '../dto/vendor-fleet-vehicle-group.dto';

/** Mirrors `controllers/vendors/Fleet/groupController.js`. */
@Injectable()
export class VendorFleetVehicleGroupService {
  constructor(private readonly repo: AdminFleetVehicleGroupRepository) {}

  async getAllVehicleGroups(fleetId: number, vendorId: number) {
    const groups = await this.repo.findGroupsByFleetAndVendor(fleetId, vendorId);
    return { success: true, message: 'Fleet vehicle groups fetched successfully', data: groups };
  }

  async createFleetVehicleGroup(vendorId: number, clientId: number, dto: CreateVendorFleetVehicleGroupDto) {
    if (!dto.name || !dto.fleetId) {
      throw new BadRequestException({ success: false, message: 'Name and Fleet ID are required' });
    }

    const existingGroup = await this.repo.findByNameFleetVendor(dto.name, dto.fleetId, vendorId);
    if (existingGroup) {
      throw new BadRequestException({ success: false, message: 'Fleet vehicle group with this name already exists' });
    }

    const existingFleet = await this.repo.findFleetByIdAndVendor(dto.fleetId, vendorId);
    if (!existingFleet) {
      throw new NotFoundException({ success: false, message: 'Fleet not found' });
    }

    const currentGroupCount = await this.repo.countGroupsByFleet(dto.fleetId, clientId);
    const groupCount = await this.repo.countGroupsByClient(clientId);

    if (existingFleet.noOfGroups !== null && currentGroupCount >= existingFleet.noOfGroups) {
      throw new BadRequestException({
        success: false,
        message: `Fleet has reached the maximum number of vehicle groups allowed (${existingFleet.noOfGroups})`,
      });
    }

    const newGroup = await this.repo.createGroup({ name: dto.name, fleetId: existingFleet.id, vendorId, clientId });

    const prefixConfigValue = await this.repo.findPrefixConfig(clientId);
    const groupIdFormat = `${prefixConfigValue?.vehicleGroup ?? ''}${(groupCount + 1).toString().padStart(5, '0')}`;
    await this.repo.updateGroupId(newGroup.id, groupIdFormat);
    newGroup.groupId = groupIdFormat;

    return { success: true, message: 'Fleet vehicle group created successfully', data: newGroup };
  }

  async updateFleetVehicleGroup(groupId: number, clientId: number, dto: UpdateVendorFleetVehicleGroupDto) {
    const group = await this.repo.findByIdAndClient(groupId, clientId);
    if (!group) {
      throw new NotFoundException({ success: false, message: 'Fleet vehicle group not found' });
    }

    const updated = await this.repo.updateGroup(groupId, { name: dto.name ?? group.name });
    return { success: true, message: 'Fleet vehicle group updated successfully', data: updated };
  }

  async deleteFleetVehicleGroup(groupId: number, vendorId: number) {
    const group = await this.repo.findByIdAndVendorWithVehicles(groupId, vendorId);
    if (!group) {
      throw new NotFoundException({ success: false, message: 'Fleet vehicle group not found' });
    }

    if (group.vehicles && group.vehicles.length > 0) {
      throw new BadRequestException({ success: false, message: 'Cannot delete group with assigned vehicles' });
    }

    await this.repo.deleteGroup(groupId);
    return { success: true, message: 'Fleet vehicle group deleted successfully' };
  }

  async getFleetGroupById(groupId: number, vendorId: number, clientId: number) {
    const group = await this.repo.findByIdAndVendorClientWithNested(groupId, vendorId, clientId);
    return { success: true, message: 'group fetched successfully', data: group };
  }
}
