import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { VendorRfidTagRepository } from '../repositories/vendor-rfid-tag.repository';
import { CreateVendorFleetRfidTagDto, UpdateVendorFleetRfidTagDto } from '../dto/vendor-fleet-rfid-tag.dto';

/** Mirrors `controllers/vendors/Fleet/rfIdController.js`. */
@Injectable()
export class VendorFleetRfidTagService {
  constructor(private readonly repo: VendorRfidTagRepository) {}

  async cpoCreateRfidTag(vendorId: number, clientId: number, dto: CreateVendorFleetRfidTagDto) {
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
      fleetGroupId: dto.fleetGroupId,
      fleetId: dto.fleetId,
      vendorId,
      clientId,
    } as any);

    return { success: true, message: 'RFID tag created successfully', data: rfidTag };
  }

  async getCpoAllRFIDsByFleetId(groupId: number, vendorId: number, search: string | undefined, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [rows, count] = await this.repo.findAndCountByGroupAndVendor(groupId, vendorId, search, skip, limit);

    return {
      success: true,
      message: 'RFID tags fetched successfully',
      data: rows,
      pagination: { totalRecords: count, totalPages: Math.ceil(count / limit), page },
    };
  }

  async getCpoRFIDTagById(rfId: number, clientId: number) {
    const rfidData = await this.repo.findByIdAndClient(rfId, clientId);
    if (!rfidData) {
      throw new NotFoundException({ success: false, message: 'RFID not found' });
    }
    return { success: true, message: 'RFID fetched successfully', data: rfidData };
  }

  async cpoUpdateRfidTag(rfId: number, clientId: number, dto: UpdateVendorFleetRfidTagDto) {
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

    const updated = await this.repo.updateById(rfId, {
      rfIdTag: dto.rfIdTag,
      expiryDate: dto.expiryDate,
      masterRfidTag: dto.masterRfidTag,
      comments: dto.comments,
      maxAmount: dto.maxAmount,
      fleetId: dto.fleetId,
      fleetGroupId: dto.fleetGroupId,
    });

    return { success: true, message: 'RFID tag updated successfully', data: updated };
  }

  async cpoDeleteRfidTag(rfId: number, clientId: number) {
    // Legacy has no tenant scope at all on this PK lookup — scoped here by clientId.
    const rfidTag = await this.repo.findByIdAndClient(rfId, clientId);
    if (!rfidTag) {
      throw new NotFoundException({ success: false, message: 'RFID tag not found' });
    }

    await this.repo.deleteById(rfId);
    return { success: true, message: 'RFID tag deleted successfully' };
  }
}
