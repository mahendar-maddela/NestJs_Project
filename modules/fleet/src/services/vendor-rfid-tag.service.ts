import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { VendorRfidTagRepository } from '../repositories/vendor-rfid-tag.repository';
import { CreateRfidTagDto, UpdateRfidTagDto } from '../dto/admin-rfid-tag.dto';

/** Mirrors `controllers/vendors/rfidTagController.js`. */
@Injectable()
export class VendorRfidTagService {
  constructor(private readonly repo: VendorRfidTagRepository) {}

  async createRfidTag(vendorId: number, clientId: number, dto: CreateRfidTagDto) {
    const existing = await this.repo.findByTag(dto.rfIdTag);
    if (existing) {
      throw new BadRequestException({ message: 'RFID Tag already exists' });
    }
    const rfIdTag = await this.repo.create({ ...dto, vendorId, clientId } as any);
    return { success: true, message: 'RFID Tag created successfully ', data: rfIdTag };
  }

  async getAllRfids(vendorId: number, search: string | undefined, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const { rows, count } = await this.repo.findAndCountForVendor(vendorId, search, skip, limit);
    return {
      success: true,
      message: 'RFID Tags fetched successfully',
      data: rows,
      pagination: { total: count, totalPages: Math.ceil(count / limit), page },
    };
  }

  async getRfidTagById(id: number, vendorId: number) {
    // Legacy has no vendor-ownership check on this PK lookup — scoped here to prevent
    // cross-tenant access, reusing legacy's exact "RFID Tag not found" 404 shape.
    const rfidTag = await this.repo.findByIdAndVendor(id, vendorId);
    if (!rfidTag) {
      throw new NotFoundException({ message: 'RFID Tag not found' });
    }
    return { success: true, message: 'RFID Tag fetched successfully', data: rfidTag };
  }

  async updateRfIdTag(id: number, vendorId: number, dto: UpdateRfidTagDto) {
    const existing = await this.repo.findByIdAndVendor(id, vendorId);
    if (!existing) {
      throw new NotFoundException({ message: 'RFID Tag not found' });
    }
    const rfIdTag = await this.repo.update(id, vendorId, dto as any);
    return { success: true, message: 'RFID Tag updated successfully', data: rfIdTag };
  }

  async deleteRfIdTag(id: number, vendorId: number) {
    const existing = await this.repo.findByIdAndVendor(id, vendorId);
    if (!existing) {
      throw new NotFoundException({ message: 'RFID Tag not found' });
    }
    await this.repo.delete(id, vendorId);
    return { message: 'RFID Tag deleted successfully' };
  }
}
