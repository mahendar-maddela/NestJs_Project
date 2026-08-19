import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Not, Repository } from 'typeorm';
import { CpoAmc } from 'modules/billing/src/entities/cpo-amc.entity';
import { ClientAmc } from 'modules/billing/src/entities/client-amc.entity';
import { ClientChargerAmc } from 'modules/billing/src/entities/client-charger-amc.entity';
import { ClientSupport } from 'modules/support/src/entities/client-support.entity';

@Injectable()
export class AmcExpiryRepository {
  constructor(
    @InjectRepository(CpoAmc) private readonly cpoAmcRepo: Repository<CpoAmc>,
    @InjectRepository(ClientAmc) private readonly clientAmcRepo: Repository<ClientAmc>,
    @InjectRepository(ClientChargerAmc) private readonly clientChargerAmcRepo: Repository<ClientChargerAmc>,
    @InjectRepository(ClientSupport) private readonly clientSupportRepo: Repository<ClientSupport>,
  ) {}

  /** Mirrors `cpoAmcController.js:markExpiredAmcs`. */
  async markExpiredCpoAmcs(): Promise<number> {
    const result = await this.cpoAmcRepo.update({ endDate: LessThan(new Date()), status: 'Active' }, { status: 'Expired' });
    return result.affected || 0;
  }

  /** Mirrors `chargerClientAmcController.js:generateExpiredChargerAmc`. */
  async markExpiredClientChargerAmcs(): Promise<number> {
    const result = await this.clientChargerAmcRepo.update(
      { endDate: LessThan(new Date()), status: 'Active' as any },
      { status: 'Expired' as any },
    );
    return result.affected || 0;
  }

  /** Mirrors `clientAmcController.js:generateExpiredClientAmc`'s expire pass (phase 1). */
  findExpiredClientAmcCandidates(todayDateOnly: Date) {
    return this.clientAmcRepo.find({ where: { endDate: LessThan(todayDateOnly), status: Not('Expired') as any } });
  }

  async markClientAmcExpired(id: number): Promise<void> {
    await this.clientAmcRepo.update(id, { status: 'Expired' as any });
  }

  /** Phase 2: monthly-cycle hours deduction for still-Active AMCs. */
  findActiveClientAmcs() {
    return this.clientAmcRepo.find({ where: { status: 'Active' as any } });
  }

  findClosedSupportsInCycle(clientId: number, cycleStart: Date, cycleEnd: Date) {
    return this.clientSupportRepo
      .createQueryBuilder('cs')
      .where('cs.clientId = :clientId', { clientId })
      .andWhere('cs.status = :status', { status: 'Closed' })
      .andWhere('cs.createdAt >= :cycleStart', { cycleStart })
      .andWhere('cs.createdAt < :cycleEnd', { cycleEnd })
      .getMany();
  }

  async updateClientAmcCycle(id: number, data: { remaining_amc_hours?: number; last_cycle_processed_at: Date }): Promise<void> {
    await this.clientAmcRepo.update(id, data as any);
  }
}
