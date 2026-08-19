import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { RfidTag } from '../entities/rfid-tag.entity';

/** Mirrors `controllers/vendors/rfidTagController.js` and `controllers/vendors/Fleet/rfIdController.js`. */
@Injectable()
export class VendorRfidTagRepository {
  constructor(@InjectRepository(RfidTag) private readonly repo: Repository<RfidTag>) {}

  findByTag(rfIdTag: string) {
    return this.repo.findOne({ where: { rfIdTag } });
  }

  create(data: Partial<RfidTag>) {
    return this.repo.save(this.repo.create(data));
  }

  findByIdAndVendor(id: number, vendorId: number) {
    return this.repo.findOne({ where: { id, vendorId }, relations: { user: true }, select: { user: { id: true, userId: true, first_name: true } } });
  }

  async update(id: number, vendorId: number, data: QueryDeepPartialEntity<RfidTag>) {
    await this.repo.update({ id, vendorId }, data);
    return this.repo.findOne({ where: { id } });
  }

  delete(id: number, vendorId: number) {
    return this.repo.delete({ id, vendorId });
  }

  // Two-phase: page over distinct ids first (the filtered `fleetUsers` join below is one-to-many
  // and would otherwise multiply rows and break skip/take), then hydrate the page with relations.
  async findAndCountForVendor(vendorId: number, search: string | undefined, skip: number, take: number) {
    const idQb = this.repo
      .createQueryBuilder('rfid')
      .select('rfid.id', 'id')
      .leftJoin('rfid.user', 'user')
      .leftJoin('rfid.fleet', 'fleet')
      .where('rfid.vendorId = :vendorId', { vendorId });

    if (search) {
      const s = `%${search}%`;
      idQb.andWhere(
        '(rfid.rfIdTag LIKE :s OR rfid.expiryDate LIKE :s OR user.userId LIKE :s OR user.first_name LIKE :s OR user.phone LIKE :s OR fleet.cName LIKE :s OR fleet.fleetUId LIKE :s)',
        { s },
      );
    }

    const count = await idQb.getCount();
    idQb.orderBy('rfid.expiryDate', 'DESC').skip(skip).take(take);
    const idRows = await idQb.getRawMany<{ id: number }>();
    const ids = idRows.map((r) => r.id);
    if (!ids.length) return { rows: [], count };

    const rows = await this.repo
      .createQueryBuilder('rfid')
      .leftJoinAndSelect('rfid.user', 'user')
      .leftJoinAndSelect('rfid.fleet', 'fleet')
      .leftJoinAndSelect('fleet.fleetUsers', 'fleetUsers', 'fleetUsers.type = :type', { type: 'FLEET_MANAGER' })
      .where('rfid.id IN (:...ids)', { ids })
      .getMany();

    const byId = new Map(rows.map((r) => [r.id, r]));
    return { rows: ids.map((id) => byId.get(id)).filter(Boolean) as RfidTag[], count };
  }

  // Legacy has no vendor/client scope on this list at all (`where:{fleetGroupId}`) — scoped here
  // by vendorId to prevent a vendor from listing another tenant's group's RFID tags.
  async findAndCountByGroupAndVendor(fleetGroupId: number, vendorId: number, search: string | undefined, skip: number, take: number) {
    const qb = this.repo
      .createQueryBuilder('rfid')
      .where('rfid.fleetGroupId = :fleetGroupId', { fleetGroupId })
      .andWhere('rfid.vendorId = :vendorId', { vendorId });

    if (search) {
      qb.andWhere('rfid.rfIdTag LIKE :s', { s: `%${search}%` });
    }

    qb.orderBy('rfid.createdAt', 'DESC').skip(skip).take(take);
    return qb.getManyAndCount();
  }

  findByIdAndClient(id: number, clientId: number) {
    return this.repo.findOne({ where: { id, clientId } });
  }

  findByTagExcludingId(rfIdTag: string, id: number) {
    return this.repo.findOne({ where: { rfIdTag, id: Not(id) } });
  }

  async updateById(id: number, data: QueryDeepPartialEntity<RfidTag>) {
    await this.repo.update(id, data);
    return this.repo.findOne({ where: { id } });
  }

  async deleteById(id: number) {
    await this.repo.delete(id);
  }
}
