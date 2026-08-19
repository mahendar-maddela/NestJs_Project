import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Charger } from '../../../chargers/src/entities/charger.entity';
import { ClientChargerAmc } from '../entities/client-charger-amc.entity';
import { ClientAmc } from '../entities/client-amc.entity';

export interface ChargerAmcListFilters {
  status?: string;
  search?: string;
  vendorId?: number;
  clientId?: number;
}

/** Mirrors `controllers/suparAdmin/chargerClientAmcController.js`. */
@Injectable()
export class SuperAdminChargerAmcRepository {
  constructor(
    @InjectRepository(Charger) private readonly chargerRepo: Repository<Charger>,
    @InjectRepository(ClientChargerAmc) private readonly clientChargerAmcRepo: Repository<ClientChargerAmc>,
    @InjectRepository(ClientAmc) private readonly clientAmcRepo: Repository<ClientAmc>,
    private readonly dataSource: DataSource,
  ) {}

  async findAndCountAllChargersWithAmc(filters: ChargerAmcListFilters, skip: number, take: number) {
    const qb = this.chargerRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.client', 'client')
      .leftJoinAndSelect('client.clientDetails', 'clientDetails')
      .leftJoinAndSelect('c.vendor', 'vendor')
      .leftJoinAndSelect('c.station', 'station');

    if (filters.search) {
      qb.andWhere('c.chargerId LIKE :s', { s: `%${filters.search}%` });
    } else {
      if (filters.status) {
        qb.innerJoin('c.clientChargerAmcs', 'cca', 'cca.status = :status', { status: filters.status });
      }
      if (filters.vendorId) {
        qb.andWhere('c.vendorId = :vendorId', { vendorId: filters.vendorId });
      }
    }

    qb.orderBy('c.id', 'DESC')
      .skip(skip)
      .take(take);

    const [rows, count] = await qb.getManyAndCount();
    return [rows, count] as const;
  }

  async findAndCountChargersByClientWithAmc(clientId: number, filters: ChargerAmcListFilters, skip: number, take: number) {
    const qb = this.chargerRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.vendor', 'vendor')
      .leftJoinAndSelect('c.station', 'station')
      .where('c.clientId = :clientId', { clientId });

    if (filters.search) {
      qb.andWhere('c.chargerId LIKE :s', { s: `%${filters.search}%` });
    } else {
      if (filters.status) {
        qb.innerJoin('c.clientChargerAmcs', 'cca', 'cca.status = :status', { status: filters.status });
      }
      if (filters.vendorId) {
        qb.andWhere('c.vendorId = :vendorId', { vendorId: filters.vendorId });
      }
    }

    qb.orderBy('c.id', 'DESC')
      .skip(skip)
      .take(take);

    const [rows, count] = await qb.getManyAndCount();
    return [rows, count] as const;
  }

  async findLatestAmcsByChargerIds(chargerIds: number[]): Promise<Map<number, ClientChargerAmc>> {
    const map = new Map<number, ClientChargerAmc>();
    if (!chargerIds.length) return map;
    const rows = await this.clientChargerAmcRepo.find({ where: { chargerId: In(chargerIds) }, order: { createdAt: 'DESC' } });
    for (const row of rows) {
      if (!map.has(row.chargerId)) map.set(row.chargerId, row);
    }
    return map;
  }

  findChargerByIdWithClientId(id: number) {
    return this.chargerRepo.findOne({ where: { id }, select: { id: true, clientId: true } });
  }

  findOnboardedAmcByCharger(chargerId: number) {
    return this.clientChargerAmcRepo.findOne({ where: { chargerId, status: 'Onboarded' as any } });
  }

  findActiveClientAmc(clientId: number) {
    return this.clientAmcRepo.findOne({ where: { clientId, status: 'Active' as any }, order: { createdAt: 'DESC' } });
  }

  countChargerAmcsByClient(clientId: number) {
    return this.clientChargerAmcRepo.count({ where: { clientId } });
  }

  async findAndCountAmcHistory(chargerId: number, skip: number, take: number) {
    return this.clientChargerAmcRepo.findAndCount({ where: { chargerId }, order: { createdAt: 'DESC' }, skip, take });
  }

  /** Runs the full renewal in one DB transaction, mirroring legacy's `sequelize.transaction()` wrapper. */
  async runRenewalTransaction<T>(
    work: (repos: { charger: Repository<Charger>; clientChargerAmc: Repository<ClientChargerAmc>; clientAmc: Repository<ClientAmc> }) => Promise<T>,
  ): Promise<T> {
    return this.dataSource.transaction(async (manager) => {
      return work({
        charger: manager.getRepository(Charger),
        clientChargerAmc: manager.getRepository(ClientChargerAmc),
        clientAmc: manager.getRepository(ClientAmc),
      });
    });
  }
}
