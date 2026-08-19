import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AdminFleetRfidRepository } from '../repositories/admin-fleet-rfid.repository';
import { CreateFleetRfidTagDto, UpdateFleetRfidTagDto } from '../dto/admin-fleet-rfid.dto';

/** Mirrors `controllers/admin/fleet/rfidController.js`. */
@Injectable()
export class AdminFleetRfidService {
  constructor(private readonly repo: AdminFleetRfidRepository) {}

  async createRfidTag(clientId: number, staffId: number, dto: CreateFleetRfidTagDto) {
    if (!dto.rfIdTag) {
      throw new BadRequestException({ success: false, message: 'rfIdTag is required' });
    }
    if (!dto.fleetId || !dto.fleetGroupId) {
      throw new BadRequestException({ success: false, message: 'Both fleetId and fleetGroupId are required' });
    }

    const existingTag = await this.repo.findByTag(dto.rfIdTag);
    if (existingTag) {
      throw new ConflictException({ success: false, message: 'RFID tag already exists' });
    }

    const rfidTag = await this.repo.create({
      rfIdTag: dto.rfIdTag,
      expiryDate: dto.expiryDate,
      masterRfidTag: dto.masterRfidTag ?? null,
      comments: dto.comments ?? null,
      maxAmount: dto.maxAmount,
      staffId,
      fleetId: dto.fleetId,
      fleetGroupId: dto.fleetGroupId,
      clientId,
    });

    return { success: true, message: 'RFID tag created successfully', data: rfidTag };
  }

  async getAllRfidsByFleetId(groupId: number, clientId: number) {
    const rfids = await this.repo.findByGroupAndClient(groupId, clientId);
    return { success: true, message: 'RFIDs fetched successfully', data: rfids };
  }

  async getRfidTagById(rfId: number, clientId: number) {
    const rfidData = await this.repo.findByIdAndClient(rfId, clientId);
    if (!rfidData) {
      throw new NotFoundException({ success: false, message: 'RFID not found' });
    }
    return { success: true, message: 'RFID fetched successfully', data: rfidData };
  }

  async updateRfidTag(rfId: number, clientId: number, dto: UpdateFleetRfidTagDto) {
    if (!dto.rfIdTag) {
      throw new BadRequestException({ success: false, message: 'rfIdTag is required' });
    }
    if (!dto.fleetId || !dto.fleetGroupId) {
      throw new BadRequestException({ success: false, message: 'Both fleetId and fleetGroupId are required' });
    }

    const rfidTag = await this.repo.findByIdAndClient(rfId, clientId);
    if (!rfidTag) {
      throw new NotFoundException({ success: false, message: 'RFID tag not found' });
    }

    const existingTag = await this.repo.findByTagExcludingId(dto.rfIdTag, rfId);
    if (existingTag) {
      throw new ConflictException({ success: false, message: 'RFID tag already exists' });
    }

    const updated = await this.repo.update(rfId, {
      rfIdTag: dto.rfIdTag,
      expiryDate: dto.expiryDate ?? null,
      masterRfidTag: dto.masterRfidTag ?? null,
      comments: dto.comments ?? null,
      vendorId: dto.vendorId ?? null,
      maxAmount: dto.maxAmount ?? null,
      staffId: dto.staffId ?? null,
      fleetId: dto.fleetId ?? null,
      fleetGroupId: dto.fleetGroupId ?? null,
    });

    return { success: true, message: 'RFID tag updated successfully', data: updated };
  }

  async deleteRfidTag(rfid: number, clientId: number) {
    const rfidTag = await this.repo.findByIdAndClient(rfid, clientId);
    if (!rfidTag) {
      throw new NotFoundException({ success: false, message: 'RFID tag not found' });
    }
    await this.repo.delete(rfid);
    return { success: true, message: 'RFID tag deleted successfully' };
  }
}
