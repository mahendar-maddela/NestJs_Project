import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { Charger } from '../entities/charger.entity';
import { Station } from '../../../stations/src/entities/station.entity';
import { User } from '../../../users/src/entities/user.entity';
import { Tariff } from '../../../tariffs/src/entities/tariff.entity';
import { VendorUser } from '../../../vendors/src/entities/vendor-user.entity';

/** Mirrors `controllers/Web/chargerController.js`. Shared by the web and app (driver) actors. */
@Injectable()
export class UserChargerRepository {
  constructor(
    @InjectRepository(Charger) private readonly chargerRepo: Repository<Charger>,
    @InjectRepository(Station) private readonly stationRepo: Repository<Station>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Tariff) private readonly tariffRepo: Repository<Tariff>,
    @InjectRepository(VendorUser) private readonly vendorUserRepo: Repository<VendorUser>,
  ) {}

  findChargerByIdClientWithStationConnectors(id: number, clientId: number) {
    return this.chargerRepo.findOne({
      where: { id, clientId },
      relations: { station: { stationLocation: true }, connectors: true },
    });
  }

  async findUserWithVendorUserTypes(userId: number | undefined, clientId: number, vendorId: number | null) {
    if (!userId) return null;
    const user = await this.userRepo.findOne({ where: { id: userId, clientId }, select: { id: true, userId: true } });
    if (!user) return null;

    const vendorUsers = await this.vendorUserRepo.find({
      where: { userId: user.id, ...(vendorId ? { vendorId } : {}) },
      relations: { userType: true },
    });

    return { ...user, vendorUserTypes: vendorUsers };
  }

  findTariff(vendorId: number | null, chargerRef: number, userTypeId: number | null) {
    return this.tariffRepo.findOne({
      where: {
        vendorId: vendorId === null ? IsNull() : vendorId,
        chargerId: chargerRef,
        userTypeId: userTypeId === null ? IsNull() : userTypeId,
      },
    });
  }

  findStationIdsBySearch(search: string) {
    const s = `%${search}%`;
    return this.stationRepo.manager.query(
      `SELECT DISTINCT s.id
       FROM Stations s
       LEFT JOIN Locations l ON l.stationId = s.id
       LEFT JOIN Chargers ch ON ch.stationId = s.id
       LEFT JOIN Connectors cn ON cn.chargerId = ch.id
       WHERE
         s.deletedAt IS NULL
         AND (
           LOWER(s.name) LIKE LOWER(?)
           OR LOWER(s.stationUniqueId) LIKE LOWER(?)
           OR LOWER(l.address) LIKE LOWER(?)
           OR LOWER(l.city) LIKE LOWER(?)
           OR LOWER(l.state) LIKE LOWER(?)
           OR LOWER(l.country) LIKE LOWER(?)
           OR LOWER(ch.chargerId) LIKE LOWER(?)
           OR LOWER(cn.connectorId) LIKE LOWER(?)
         )`,
      [s, s, s, s, s, s, s, s],
    ) as Promise<{ id: number }[]>;
  }

  findStationsByIdsClient(ids: number[], clientId: number) {
    if (!ids.length) return Promise.resolve([]);
    return this.stationRepo.find({
      where: { id: In(ids), clientId },
      relations: { stationLocation: true, chargers: { connectors: true } },
      order: { createdAt: 'DESC' },
    });
  }

  findChargerByChargerIdClient(chargerId: string, clientId: number) {
    return this.chargerRepo.findOne({ where: { chargerId, clientId }, select: { id: true, chargerId: true } });
  }
}
