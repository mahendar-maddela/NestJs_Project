import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import { ChargingSession } from '../entities/charging-session.entity';
import { Charger } from '../../../chargers/src/entities/charger.entity';

@Injectable()
export class SessionRepository {
  constructor(
    @InjectRepository(ChargingSession)
    private readonly sessionRepo: Repository<ChargingSession>,
    @InjectRepository(Charger)
    private readonly chargerRepo: Repository<Charger>,
  ) { }

  async findById(id: number) {
    return this.sessionRepo.findOne({ where: { id } });
  }

  findChargerByIdAndClient(id: number, clientId: number) {
    return this.chargerRepo.findOne({ where: { id, clientId }, select: { id: true, chargerId: true } });
  }

  async findAndCountAllAdmin(skip: number, take: number) {
    return this.sessionRepo.findAndCount({ order: { id: 'DESC' }, skip, take });
  }

  async findAndCountByChargerBusinessId(chargerId: string, skip: number, take: number) {
    return this.sessionRepo.findAndCount({
      where: { chargerId },
      order: { id: 'DESC' },
      relations: {
        user: true,
        fleetUser: true,
        transaction: true,
        emsp: true
      },
      skip,
      take,
      select: {
        // User
        user: {
          userId: true,
          id: true,
          first_name: true,
          phone: true,
          email: true,
        },

        // Transaction
        transaction: {
          id: true,
          transactionId: true,
        },

        // Add only required fleetUser fields
        fleetUser: {
          id: true,
          cName: true,
          fleetUId: true,
        },

        emsp: {
          id: true,
          business_name: true,
          party_id: true
        },
      }
    });
  }

  async findBySessionId(sessionId: string) {
    return this.sessionRepo.findOne({ where: { sessionId } });
  }

  async findAll(params: { skip?: number; take?: number; where?: Record<string, unknown> }) {
    const options: FindManyOptions<ChargingSession> = {};
    if (params.where) options.where = params.where as any;
    if (params.skip !== undefined) options.skip = params.skip;
    if (params.take !== undefined) options.take = params.take;
    return this.sessionRepo.find(options);
  }

  async create(data: Partial<ChargingSession>) {
    return this.sessionRepo.save(this.sessionRepo.create(data));
  }

  async update(id: number, data: Partial<ChargingSession>) {
    await this.sessionRepo.update(id, data as any);
    return this.sessionRepo.findOne({ where: { id } });
  }
}
