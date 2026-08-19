import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { ChargingSession } from 'modules/sessions/src/entities/charging-session.entity';
import { Charger } from 'modules/chargers/src/entities/charger.entity';

/** Backs QrSweepService only — kept self-contained in apps/scheduler rather than importing the full
 *  PaymentsModule/ChargersModule, which would drag in every controller/guard those modules declare. */
@Injectable()
export class QrSweepRepository {
  constructor(
    @InjectRepository(ChargingSession) private readonly sessionRepo: Repository<ChargingSession>,
    @InjectRepository(Charger) private readonly chargerRepo: Repository<Charger>,
  ) {}

  /** Mirrors `remoteStartManager.js:sweepOnce`'s query for stuck QRPAY sessions. */
  findDueQrSweepSessions() {
    return this.sessionRepo.find({
      where: { platform: 'QRPAY', status: 'Initiated', paymentTransactionId: Not(IsNull()) },
      order: { nextActionAt: 'ASC' },
    });
  }

  findChargerById(id: number) {
    return this.chargerRepo.findOne({ where: { id }, select: { id: true, chargerId: true, clientId: true } });
  }

  updateRemoteStart(id: number, remoteStartAttempts: number, nextActionAt: Date) {
    return this.sessionRepo.update(id, { remoteStartAttempts, nextActionAt });
  }
}
