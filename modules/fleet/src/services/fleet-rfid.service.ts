import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AdminFleetRfidRepository } from '../repositories/admin-fleet-rfid.repository';
import { CreateFleetRfidTagDto, UpdateFleetRfidTagDto } from '../dto/fleet-rfid.dto';

/** Mirrors `controllers/Fleet/rfIdController.js`. */
@Injectable()
export class FleetRfidService {
  constructor(private readonly repo: AdminFleetRfidRepository) {}

  async createRfidTag(fleetId: number, clientId: number, dto: CreateFleetRfidTagDto) {
    if (!dto.rfIdTag) {
      throw new BadRequestException({ success: false, message: 'rfIdTag is required' });
    }
    if (!fleetId || !dto.fleetGroupId) {
      throw new BadRequestException({ success: false, message: 'Both fleetId and fleetGroupId are required' });
    }

    const existingTag = await this.repo.findByTag(dto.rfIdTag);
    if (existingTag) {
      throw new ConflictException({ success: false, message: 'RFID tag already exists' });
    }

    const rfidTag = await this.repo.create({
      rfIdTag: dto.rfIdTag,
      expiryDate: dto.expiryDate ?? null,
      masterRfidTag: dto.masterRfidTag ?? null,
      comments: dto.comments ?? null,
      vendorId: dto.vendorId ?? null,
      maxAmount: dto.maxAmount ?? null,
      staffId: dto.staffId ?? null,
      fleetId,
      fleetGroupId: dto.fleetGroupId,
      clientId,
    });

    return { success: true, message: 'RFID tag created successfully', data: rfidTag };
  }

  async getAllRFIdById(groupId: number, fleetId: number, clientId: number) {
    const rfidTags = await this.repo.findByGroupFleetClient(groupId, fleetId, clientId);
    return { success: true, message: 'RFID tags fetched successfully', data: rfidTags };
  }

  async editRfIdTag(id: number, dto: UpdateFleetRfidTagDto) {
    const rfidTag = await this.repo.findById(id);
    if (!rfidTag) {
      throw new NotFoundException({ success: false, message: 'RFID Tag not found' });
    }

    const updated = await this.repo.update(id, {
      expiryDate: dto.expiryDate ?? rfidTag.expiryDate,
      comments: dto.comments ?? rfidTag.comments,
      maxAmount: dto.maxAmount ?? rfidTag.maxAmount,
      rfIdTag: dto.rfIdTag ?? rfidTag.rfIdTag,
    });

    return { success: true, message: 'RFID Tag updated successfully', data: updated };
  }

  async deleteRfIdTag(id: number, fleetId: number, clientId: number) {
    const rfidTag = await this.repo.findByIdFleetClient(id, fleetId, clientId);
    if (!rfidTag) {
      throw new NotFoundException({ success: false, message: 'RFID Tag not Found' });
    }

    await this.repo.delete(id);
    return { success: true, message: 'RFID Tag deleted Sucessfully' };
  }
}
