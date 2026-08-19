import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceTransaction } from '../entities/device-transaction.entity';
import { ChargingSession } from '../entities/charging-session.entity';
import { TransactionDetail } from '../entities/transaction-detail.entity';
import { Connector } from '../../../chargers/src/entities/connector.entity';
import { OcpiCpoSession } from '../../../ocpi/src/entities/ocpi-cpo-session.entity';
import { OcpiCpoTransaction } from '../../../ocpi/src/entities/ocpi-cpo-transaction.entity';
import { OcpiCpoEvse } from '../../../ocpi/src/entities/ocpi-cpo-evse.entity';

/** Mirrors `controllers/Web/deviceTransactionController.js` + `controllers/APP/deviceTransactions.js`. Shared by the web and app (driver) actors. */
@Injectable()
export class UserDeviceTransactionRepository {
  constructor(
    @InjectRepository(DeviceTransaction) private readonly deviceTransactionRepo: Repository<DeviceTransaction>,
    @InjectRepository(ChargingSession) private readonly chargingSessionRepo: Repository<ChargingSession>,
    @InjectRepository(TransactionDetail) private readonly transactionDetailRepo: Repository<TransactionDetail>,
    @InjectRepository(Connector) private readonly connectorRepo: Repository<Connector>,
    @InjectRepository(OcpiCpoSession) private readonly ocpiCpoSessionRepo: Repository<OcpiCpoSession>,
    @InjectRepository(OcpiCpoTransaction) private readonly ocpiCpoTransactionRepo: Repository<OcpiCpoTransaction>,
    @InjectRepository(OcpiCpoEvse) private readonly ocpiCpoEvseRepo: Repository<OcpiCpoEvse>,
  ) {}

  /** Mirrors `controllers/Web/deviceTransactionController.js:getAlldeviceTransaction`. */
  async findAndCountByUser(userId: number, skip: number, take: number) {
    return this.deviceTransactionRepo.findAndCount({
      where: { userId },
      select: { transactionId: true, startDate: true, stopDate: true, totalWh: true, price: true },
      order: { id: 'DESC' },
      skip,
      take,
    });
  }

  /** Mirrors `controllers/APP/deviceTransactions.js:getAllDeviceTransactions` (local half). */
  async findAndCountByUserWithCharger(userId: number, status: string | undefined, skip: number, take: number) {
    const qb = this.deviceTransactionRepo
      .createQueryBuilder('dt')
      .select([
        'dt.id',
        'dt.transactionId',
        'dt.connectorId',
        'dt.startDate',
        'dt.macId',
        'dt.stopDate',
        'dt.status',
        'dt.charginDuration',
        'dt.price',
        'dt.totalWh',
        'dt.startSoc',
        'dt.stopSoc',
        'dt.createdAt',
      ])
      .leftJoin('dt.charger', 'charger')
      .addSelect(['charger.id', 'charger.chargerId', 'charger.capacity', 'charger.powerType', 'charger.status'])
      .leftJoin('charger.station', 'station')
      .addSelect(['station.id', 'station.name', 'station.stationUniqueId'])
      .leftJoin('station.stationLocation', 'stationLocation')
      .addSelect(['stationLocation.address', 'stationLocation.city', 'stationLocation.state', 'stationLocation.country', 'stationLocation.pincode'])
      .leftJoin(ChargingSession, 'session', 'session.transactionId = dt.id')
      .addSelect(['session.sessionId', 'session.id'])
      .where('dt.userId = :userId', { userId })
      .orderBy('dt.createdAt', 'DESC')
      .skip(skip)
      .take(take);

    if (status) qb.andWhere('dt.status = :status', { status });

    return qb.getManyAndCount();
  }

  async findOcpiTransactionsForUser(userId: number, status: string | undefined, range: { start: Date; end: Date } | undefined) {
    const qb = this.ocpiCpoTransactionRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.sessions', 'session')
      .where('t.user_id = :userId', { userId });

    if (status) qb.andWhere('t.status = :status', { status: status === '1' ? 'COMPLETED' : 'ACTIVE' });
    if (range) qb.andWhere('t.createdAt BETWEEN :start AND :end', { start: range.start, end: range.end });

    const transactions = await qb.orderBy('t.createdAt', 'DESC').getMany();
    if (!transactions.length) return [];

    // Legacy's `OcpiCpoTransaction.evse_id` FK points at `OcpiCpoEvse.id` (the PK), not the OCPI string `evse_id`.
    const evseIds = [...new Set(transactions.map((t) => t.evse_id).filter((id): id is number => id != null))];
    const evses = evseIds.length
      ? await this.ocpiCpoEvseRepo.createQueryBuilder('evse').leftJoinAndSelect('evse.location', 'location').where('evse.id IN (:...evseIds)', { evseIds }).getMany()
      : [];
    const evseById = new Map(evses.map((e) => [e.id, e]));

    return transactions.map((t) => ({ ...t, evse: t.evse_id != null ? evseById.get(t.evse_id) : undefined }));
  }

  async sumPriceByUser(userId: number): Promise<number> {
    const raw = await this.deviceTransactionRepo.createQueryBuilder('dt').select('SUM(dt.price)', 'total').where('dt.userId = :userId', { userId }).getRawOne<{ total: string | null }>();
    return Number(raw?.total) || 0;
  }

  async sumTotalWhByUser(userId: number): Promise<number> {
    const raw = await this.deviceTransactionRepo.createQueryBuilder('dt').select('SUM(dt.totalWh)', 'total').where('dt.userId = :userId', { userId }).getRawOne<{ total: string | null }>();
    return Number(raw?.total) || 0;
  }

  /** Mirrors `controllers/Web/deviceTransactionController.js:runningTransactionData`. */
  findRunningSessionsByUser(userId: number) {
    return this.chargingSessionRepo
      .createQueryBuilder('cs')
      .select(['cs.sessionId', 'cs.chargerId', 'cs.connectorId'])
      .innerJoin('cs.transaction', 'transaction', 'transaction.status = 0')
      .addSelect(['transaction.transactionId'])
      .where('cs.userId = :userId', { userId })
      .andWhere('cs.status = :status', { status: 'Started' })
      .getMany();
  }

  findActiveOcpiSessionsByUser(userId: number) {
    return this.ocpiCpoSessionRepo
      .createQueryBuilder('s')
      .select(['s.session_id', 's.evse_id', 's.evse_uid'])
      .innerJoin('s.transaction', 'transaction', 'transaction.status = :txStatus', { txStatus: 'ACTIVE' })
      .addSelect(['transaction.session_id', 'transaction.authorization_reference'])
      .where('s.user_id = :userId', { userId })
      .andWhere('s.status = :status', { status: 'ACTIVE' })
      .getMany();
  }

  /** Mirrors `controllers/Web/deviceTransactionController.js:singleRunnigData`. */
  findSessionWithTransactionBySessionId(sessionId: string) {
    return this.chargingSessionRepo
      .createQueryBuilder('cs')
      .select(['cs.sessionId', 'cs.id'])
      .innerJoinAndSelect('cs.transaction', 'transaction')
      .leftJoinAndSelect('transaction.charger', 'charger')
      .leftJoinAndSelect('charger.station', 'station')
      .leftJoinAndSelect('station.stationLocation', 'stationLocation')
      .leftJoinAndSelect('transaction.vehicle', 'vehicle')
      .where('cs.sessionId = :sessionId', { sessionId })
      .getRawOne();
  }

  findLatestTransactionDetail(transactionId: number) {
    return this.transactionDetailRepo.findOne({ where: { transactionId }, order: { createdAt: 'DESC' } });
  }

  findConnectors(connectorId: string, chargerRef: number) {
    return this.connectorRepo.find({ where: { connectorId, chargerId: chargerRef } });
  }
}
