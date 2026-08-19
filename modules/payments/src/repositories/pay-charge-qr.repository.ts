import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Not, Repository } from 'typeorm';
import { PayChargeQRCode } from '../entities/pay-charge-qr-code.entity';
import { Charger } from '../../../chargers/src/entities/charger.entity';
import { Connector } from '../../../chargers/src/entities/connector.entity';
import { RoamingTariff } from '../../../ocpi/src/entities/roaming-tariff.entity';
import { Tariff } from '../../../tariffs/src/entities/tariff.entity';
import { PaymentTransaction } from '../entities/payment-transaction.entity';
import { ChargingSession } from '../../../sessions/src/entities/charging-session.entity';
import { PrefixConfig } from '../../../clients/src/entities/prefix-config.entity';

export interface QrSettlementRepos {
  paymentTransaction: Repository<PaymentTransaction>;
  chargingSession: Repository<ChargingSession>;
  roamingTariff: Repository<RoamingTariff>;
  tariff: Repository<Tariff>;
  prefixConfig: Repository<PrefixConfig>;
}

/** Backs the QR Pay & Charge admin routes (`qr.controller.js`) and the `qr_code.credited` webhook (`payAndChargeHandler.js`). */
@Injectable()
export class PayChargeQrRepository {
  constructor(
    @InjectRepository(PayChargeQRCode) private readonly qrRepo: Repository<PayChargeQRCode>,
    @InjectRepository(Charger) private readonly chargerRepo: Repository<Charger>,
    @InjectRepository(Connector) private readonly connectorRepo: Repository<Connector>,
    @InjectRepository(RoamingTariff) private readonly roamingTariffRepo: Repository<RoamingTariff>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /** Mirrors `createQrCodeForPayAndCharge`'s `Charger.findOne({include:[Connector]})`. */
  findChargerWithConnectors(chargerId: number, clientId: number) {
    return this.chargerRepo.findOne({
      where: { id: chargerId, clientId },
      select: { id: true, chargerId: true, vendorId: true, clientId: true },
      relations: { connectors: true },
    });
  }

  /** Mirrors both routes' `RoamingTariff.findOne({where:{chargerId, clientId, tariffType:"QRPAY", importClientId:null, emspId:null}})`. */
  findQrTariff(chargerId: number, clientId: number) {
    return this.roamingTariffRepo.findOne({
      where: { chargerId, clientId, tariffType: 'QRPAY', importClientId: IsNull(), emspId: IsNull() },
    });
  }

  async upsertQrTariff(existing: RoamingTariff | null, chargerId: number, vendorId: number | null, clientId: number, price: number, gst: number) {
    if (existing) {
      existing.price = price;
      existing.gst = gst;
      return this.roamingTariffRepo.save(existing);
    }
    return this.roamingTariffRepo.save(
      this.roamingTariffRepo.create({
        chargerId,
        vendorId,
        price: price || 1,
        gst: gst || 0,
        clientId,
        tariffType: 'QRPAY',
        importClientId: null,
        emspId: null,
      }),
    );
  }

  findQrCodeRecord(clientId: number, chargerId: number, connectorId: number) {
    return this.qrRepo.findOne({ where: { clientId, chargerId, connectorId } });
  }

  createQrCodeRecord(data: Partial<PayChargeQRCode>) {
    return this.qrRepo.save(this.qrRepo.create(data));
  }

  saveQrCodeRecord(record: PayChargeQRCode) {
    return this.qrRepo.save(record);
  }

  /** Mirrors `downloadQrCodeForPayAndCharge`'s `PayChargeQRCode.findOne({where:{clientId, chargerId, qrProviderId, connectorId}})`. */
  findQrCodeForDownload(clientId: number, chargerId: number, connectorId: number, qrProviderId: string) {
    return this.qrRepo.findOne({ where: { clientId, chargerId, connectorId, qrProviderId } });
  }

  /** Mirrors `payAndChargeHandler.js`'s `PayChargeQRCode.findOne({include:[{model:Connector, include:[Charger]}]})` — join via query builder rather than adding new entity relations (CLAUDE.md: "Use Select over Include"). */
  async findQrCodeWithChargerByProviderId(qrProviderId: string): Promise<{ qr: PayChargeQRCode; connector: Connector; charger: Charger } | null> {
    const qr = await this.qrRepo.findOne({ where: { qrProviderId } });
    if (!qr) return null;

    const connector = await this.connectorRepo.findOne({ where: { id: qr.connectorId } });
    if (!connector) return null;

    const charger = await this.chargerRepo.findOne({ where: { id: connector.chargerId } });
    if (!charger) return null;

    return { qr, connector, charger };
  }

  findPaymentByPaymentId(paymentId: string) {
    return this.dataSource.getRepository(PaymentTransaction).findOne({ where: { paymentId }, select: { id: true, status: true } });
  }

  /** Wraps PaymentTransaction + ChargingSession creation (plus the tariff/prefix lookups) in a single DB transaction, mirroring `handlePayAndChargeWebhook`'s `sequelize.transaction()`. */
  runInTransaction<T>(work: (repos: QrSettlementRepos) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(async (manager) => {
      return work({
        paymentTransaction: manager.getRepository(PaymentTransaction),
        chargingSession: manager.getRepository(ChargingSession),
        roamingTariff: manager.getRepository(RoamingTariff),
        tariff: manager.getRepository(Tariff),
        prefixConfig: manager.getRepository(PrefixConfig),
      });
    });
  }

  updateChargingSessionRemoteStart(id: number, remoteStartAttempts: number, nextActionAt: Date) {
    return this.dataSource.getRepository(ChargingSession).update(id, { remoteStartAttempts, nextActionAt });
  }

  /** Sweeper support: mirrors `remoteStartManager.js:sweepOnce`'s query for stuck QRPAY sessions. */
  findDueQrSweepSessions() {
    return this.dataSource.getRepository(ChargingSession).find({
      where: { platform: 'QRPAY', status: 'Initiated', paymentTransactionId: Not(IsNull()) },
      order: { nextActionAt: 'ASC' },
      select: { id: true, sessionId: true, connectorId: true, nextActionAt: true, remoteStartAttempts: true, maxAmount: true, chargerRef: true, clientId: true, paymentTransactionId: true },
    });
  }

  findChargerById(chargerRef: number) {
    return this.chargerRepo.findOne({ where: { id: chargerRef }, select: { id: true, chargerId: true, clientId: true } });
  }

  /** Mirrors `refundPayAndChargeAmount`'s `PaymentTransaction.findOne({attributes:["id","paymentId","clientId"]})`. */
  findPaymentTransactionForRefund(id: number) {
    return this.dataSource.getRepository(PaymentTransaction).findOne({ where: { id }, select: { id: true, paymentId: true, clientId: true } });
  }

  async applyRefund(paymentTransactionId: number, refundId: string, refundAmount: number, sessionRowId: number, failureReason: string, status: string) {
    await this.dataSource.getRepository(PaymentTransaction).update(paymentTransactionId, { refundId, refundAmount });
    await this.dataSource.getRepository(ChargingSession).update(sessionRowId, { failureReason, status: status as any, nextActionAt: null });
  }
}
