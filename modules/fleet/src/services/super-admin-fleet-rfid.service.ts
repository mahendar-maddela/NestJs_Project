import { BadRequestException, Injectable } from '@nestjs/common';
import { AdminFleetRfidRepository } from '../repositories/admin-fleet-rfid.repository';

/** Mirrors `controllers/suparAdmin/fleet/rfidController.js`. */
@Injectable()
export class SuperAdminFleetRfidService {
  constructor(private readonly repo: AdminFleetRfidRepository) {}

  async getRFIDsByGroupId(groupId: string | undefined) {
    if (!groupId) {
      throw new BadRequestException({ success: false, message: 'groupId is required' });
    }
    const rfids = await this.repo.findByGroup(Number(groupId));
    return { success: true, message: 'RFIDs fetched successfully', data: rfids };
  }
}
