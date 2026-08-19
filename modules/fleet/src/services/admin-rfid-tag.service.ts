import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminRfidTagRepository } from '../repositories/admin-rfid-tag.repository';
import { CreateRfidTagDto, UpdateRfidTagDto, RfidTagQueryDto } from '../dto/admin-rfid-tag.dto';

function normalizeMasterTag(value: string | number | undefined): number | null {
  if (value === undefined || value === null) return null;
  return String(value).length > 1 ? (value as number) : null;
}

/** Mirrors `controllers/admin/rfidController.js`. */
@Injectable()
export class AdminRfidTagService {
  constructor(private readonly repo: AdminRfidTagRepository) {}

  async createRfidTag(clientId: number, staffId: number, dto: CreateRfidTagDto) {
    const existing = await this.repo.findByTag(dto.rfIdTag);
    if (existing) {
      throw new BadRequestException({ message: 'RFID Tag already exists' });
    }

    const rfIdTag = await this.repo.create({
      ...dto,
      masterRfidTag: normalizeMasterTag(dto.masterRfidTag),
      staffId,
      clientId,
    });

    return { success: true, message: 'RFID Tag created successfully ', data: rfIdTag };
  }

  async updateRfidTag(id: number, clientId: number, dto: UpdateRfidTagDto) {
    const rfIdTag = await this.repo.findByIdAndClient(id, clientId);
    if (!rfIdTag) {
      throw new NotFoundException({ message: 'RFID Tag not found' });
    }

    if (dto.rfIdTag) {
      const existing = await this.repo.findByTag(dto.rfIdTag);
      if (existing && existing.id !== rfIdTag.id) {
        throw new BadRequestException({ message: 'RFID Tag already exists' });
      }
    }

    const updated = await this.repo.update(id, {
      ...dto,
      masterRfidTag: normalizeMasterTag(dto.masterRfidTag),
    });

    return { success: true, message: 'RFID Tag updated successfully', data: updated };
  }

  async deleteRfidTag(id: number, clientId: number) {
    const rfIdTag = await this.repo.findByIdAndClient(id, clientId);
    if (!rfIdTag) {
      throw new NotFoundException({ message: 'RFID Tag not found' });
    }
    await this.repo.delete(id);
    return { message: 'RFID Tag deleted successfully' };
  }

  async getRfidTagById(id: number, clientId: number) {
    const rfIdTag = await this.repo.findByIdAndClientWithUser(id, clientId);
    if (!rfIdTag) {
      throw new NotFoundException({ message: 'RFID Tag not found' });
    }
    return { success: true, message: 'RFID Tag fetched successfully', data: rfIdTag };
  }

  async getAllRfidTags(clientId: number, query: RfidTagQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const [rows, count] = await this.repo.findAndCountPaginated(clientId, query.search, skip, limit);

    return {
      success: true,
      message: 'RFID tags fetched successfully',
      data: rows,
      pagination: { totalRecords: count, totalPages: Math.ceil(count / limit), page },
    };
  }
}
