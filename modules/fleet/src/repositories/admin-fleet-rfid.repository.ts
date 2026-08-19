import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { RfidTag } from '../entities/rfid-tag.entity';

@Injectable()
export class AdminFleetRfidRepository {
  constructor(@InjectRepository(RfidTag) private readonly repo: Repository<RfidTag>) {}

  findByTag(rfIdTag: string) {
    return this.repo.findOne({ where: { rfIdTag }, select: { id: true, rfIdTag: true } });
  }

  findByTagExcludingId(rfIdTag: string, excludeId: number) {
    return this.repo.findOne({ where: { rfIdTag, id: Not(excludeId) } });
  }

  create(data: Partial<RfidTag>) {
    return this.repo.save(this.repo.create(data));
  }

  findByGroupAndClient(fleetGroupId: number, clientId: number) {
    return this.repo.find({ where: { fleetGroupId, clientId } });
  }

  findByIdAndClient(id: number, clientId: number) {
    return this.repo.findOne({ where: { id, clientId } });
  }

  async update(id: number, data: Partial<RfidTag>) {
    await this.repo.update(id, data as any);
    return this.repo.findOne({ where: { id } });
  }

  async delete(id: number) {
    await this.repo.delete(id);
  }

  /** Mirrors `controllers/suparAdmin/fleet/rfidController.js:getRFIDsByGroupId` — no clientId scope. */
  findByGroup(fleetGroupId: number) {
    return this.repo.find({ where: { fleetGroupId } });
  }

  // ---- Fleet self-service actor (scoped by the JWT's own fleetId + clientId) ----

  /** Mirrors `controllers/Fleet/rfIdController.js:getAllRFIdById`. */
  findByGroupFleetClient(fleetGroupId: number, fleetId: number, clientId: number) {
    return this.repo.find({ where: { fleetGroupId, fleetId, clientId } });
  }

  /** Mirrors `controllers/Fleet/rfIdController.js:editRfIdTag` — no fleetId/clientId scope (legacy quirk, preserved). */
  findById(id: number) {
    return this.repo.findOne({ where: { id } });
  }

  /** Mirrors `controllers/Fleet/rfIdController.js:deleteRfIdTag`. */
  findByIdFleetClient(id: number, fleetId: number, clientId: number) {
    return this.repo.findOne({ where: { id, fleetId, clientId } });
  }
}
