import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { WebSocket } from 'ws';
import * as crypto from 'crypto';
import { randomUUID } from 'crypto';
import { amountToEnergyConversion } from '../../common/utils/amount-to-energy.util';
import { OcppLoggerService } from '../../common/services/ocpp-logger.service';
import { RealtimeBridgeService } from '../../common/services/realtime-bridge.service';
import { FirebaseService } from '@integrations/firebase';
import { postMethodOcpi } from '@modules/ocpi/src/utils/ocpi-http.util';

const statusMessages = {
  Accepted: 'Accepted',
  Blocked: 'Blocked',
  Expired: 'Expired',
  Invalid: 'Invalid',
  ConcurrentTx: 'ConcurrentTx',
};

const createResponse = (uuid: string, status: string, additionalInfo: any = {}, transactionId?: bigint | number) => {
  return [
    3,
    uuid,
    {
      idTagInfo: {
        status,
        ...additionalInfo,
      },
      transactionId: transactionId !== undefined ? Number(transactionId) : undefined,
    },
  ];
};

const generateTransactionId = (id: number) => 1000000 + id;

const toDateOnly = (d: Date | string | null | undefined): number | null =>
  d ? new Date(d).setHours(0, 0, 0, 0) : null;

@Injectable()
export class StartTransactionHandlerV16 {
  private readonly logger = new Logger(StartTransactionHandlerV16.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly ocppLogger: OcppLoggerService,
    private readonly firebaseService: FirebaseService,
    private readonly realtimeBridge: RealtimeBridgeService,
  ) { }

  async handle(message: any[], chargerIdStr: string, ws: WebSocket): Promise<any[] | void> {
    const uuid = message[1];
    const { connectorId, idTag, meterStart } = message[3] || {};

    if (!idTag) {
      return createResponse(uuid, statusMessages.Invalid);
    }

    try {
      const charger = await this.dataSource
        .createQueryBuilder()
        .select(['c.id', 'c.chargerId', 'c.powerType', 'c.vendorId', 'c.stationId', 'c.clientId'])
        .from('chargers', 'c')
        .where('c.chargerId = :chargerIdStr', { chargerIdStr })
        .getRawOne();

      if (!charger) {
        return createResponse(uuid, statusMessages.Invalid);
      }

      const prefixConfig = await this.dataSource
        .createQueryBuilder()
        .select(['pc.session', 'pc.wallet'])
        .from('prefixconfigs', 'pc')
        .where('pc.clientId = :clientId', { clientId: charger.clientId })
        .getRawOne();

      const sessionPrefix = prefixConfig?.session || 'NEX';

      if (idTag.startsWith(sessionPrefix)) {
        const session = await this.dataSource
          .createQueryBuilder()
          .select('cs.*')
          .from('chargingsessions', 'cs')
          .where('cs.sessionId = :idTag AND cs.clientId = :clientId AND cs.status NOT IN (:...invalidStatuses)', {
            idTag,
            clientId: charger.clientId,
            invalidStatuses: ['Started', 'Completed'],
          })
          .orderBy('cs.createdAt', 'DESC')
          .getRawOne();

        if (!session) {
          return createResponse(uuid, statusMessages.Invalid);
        }

        const runningTx = await this.dataSource
          .createQueryBuilder()
          .select('dt.id')
          .from('devicetransactions', 'dt')
          .where('dt.chargerId = :chargerIdStr AND dt.connectorId = :connectorId AND dt.status = 0', {
            chargerIdStr,
            connectorId: String(connectorId),
          })
          .getRawOne();

        if (runningTx) {
          return createResponse(uuid, statusMessages.ConcurrentTx, {
            transactionId: '',
            message: 'Connector is Already Occupied',
          });
        }

        const insertResult = await this.dataSource
          .createQueryBuilder()
          .insert()
          .into('devicetransactions')
          .values({
            connectorId: String(connectorId),
            userId: session.userId || null,
            fleetId: session.fleetId || null,
            startDate: new Date(),
            stopDate: null,
            charginDuration: 0,
            startMeterValue: meterStart || 0,
            stopMeterValue: 0,
            status: 0,
            totalWh: 0,
            chargerId: chargerIdStr,
            maxEnergy: session.maxEnergy || 0,
            maxAmount: session.maxAmount || 0,
            startSoc: 0,
            stopSoc: 0,
            chargerRef: charger.id,
            platform: session.platform,
            isDualMode: connectorId === 0,
            calcPrice: session.calcPrice || 0,
            calcTaxPercent: session.calcTaxPercent || 0,
            tariffName: session.tariffName || null,
            startDriverId: session.startDriverId || null,
            emspId: session.emspId || null,
            clientId: session.clientId,
            initiatedClientId: session.initiatedClientId || null,
            paymentTransactionId: session.paymentTransactionId || null,
          })
          .execute();

        const createdTxId = insertResult.raw.insertId;
        const transactionId = generateTransactionId(createdTxId);

        await this.dataSource
          .createQueryBuilder()
          .update('devicetransactions')
          .set({ transactionId: BigInt(transactionId) as any })
          .where('id = :id', { id: createdTxId })
          .execute();

        const res = createResponse(uuid, statusMessages.Accepted, {}, transactionId);

        await this.dataSource
          .createQueryBuilder()
          .update('chargingsessions')
          .set({ transactionId: createdTxId, status: 'Started' as any })
          .where('id = :id', { id: session.id })
          .execute();

        // Mirrors legacy `handleStartTransaction.js`'s `io.to(session.sessionId).emit('StartTransaction', session.sessionId)`
        this.realtimeBridge.emitToRoom(session.sessionId, 'StartTransaction', session.sessionId).catch((err) =>
          this.logger.error(`Realtime StartTransaction emit failed for session ${session.sessionId}: ${err.message}`),
        );

        ws.send(JSON.stringify(res));
        await this.ocppLogger.logData(res, chargerIdStr, 2, 'StartTransaction');

        if (session.platform === 'OCPI') {
          this.notifyOcpiStartResult(session.sessionId).catch((err) =>
            this.logger.error(`OCPI start-result notify failed for session ${session.sessionId}: ${err.message}`),
          );
        }

        if (session.userId) {
          this.sendChargingStartedNotification(
            session.userId,
            '⚡ Charging started🔋',
            'Your vehicle is now charging. Sit back and relax while it powers up.',
            session.sessionId ?? '',
            transactionId,
          ).catch((err) => this.logger.error('Push notification error: ' + err.message));
        }

        if (session.platform === 'QRPAY') {
          this.handleQrPayPostStart(charger, { transactionId, connectorId: session.connectorId, maxEnergy: session.maxEnergy }, ws).catch((err) =>
            this.logger.error(`DataTransfer failed for tx ${transactionId}: ${err.message}`),
          );
        }

        return;
      }

      if (idTag.startsWith('VID')) {
        return this.handleVidFlow(uuid, charger, chargerIdStr, idTag, connectorId, meterStart, sessionPrefix);
      }

      return this.handleRfidFlow(uuid, charger, chargerIdStr, idTag, connectorId, meterStart, sessionPrefix);
    } catch (error: any) {
      this.logger.error(`StartTransaction error for ${chargerIdStr}: ${error.message}`);
      return createResponse(uuid, statusMessages.Invalid, { message: 'Backend Server Issue' });
    }
  }

  private async handleVidFlow(
    uuid: string,
    charger: any,
    chargerIdStr: string,
    idTag: string,
    connectorId: number,
    meterStart: number,
    sessionPrefix: string,
  ): Promise<any[]> {
    const vid = idTag.split(':')[1];
    if (!vid) return createResponse(uuid, statusMessages.Invalid);

    const vehicle = await this.dataSource
      .createQueryBuilder()
      .select('v.*')
      .from('vehicles', 'v')
      .where('v.vinNumber = :vid AND v.autoCharge = true AND v.clientId = :clientId', {
        vid,
        clientId: charger.clientId,
      })
      .getRawOne();

    if (!vehicle) {
      return createResponse(uuid, statusMessages.Invalid, {
        message: 'Vehicle not found or auto charge not enabled',
      });
    }

    // Mirrors legacy's `Vendor.findByPk(..., { include: [{ model: Feature, as: 'features', where: { name: 'Auto Charge' }, required: true }] })` —
    // must confirm THIS vendor has been granted the Auto Charge feature, not merely that the feature exists somewhere in the system.
    const autoChargeFeature = await this.dataSource
      .createQueryBuilder()
      .select('f.id')
      .from('features', 'f')
      .innerJoin('featurepermissions', 'fp', 'fp.featureId = f.id')
      .where('f.name = :name AND fp.vendorId = :vendorId', { name: 'Auto Charge', vendorId: charger.vendorId })
      .getRawOne();

    if (!autoChargeFeature) return createResponse(uuid, statusMessages.Invalid);

    let startDriverId: number | null = null;
    let activeUserType: any = null;

    if (vehicle.fleetId) {
      const now = new Date();
      const today = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const currentTime = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false });

      const driverVehicle = await this.dataSource
        .createQueryBuilder()
        .select('fdv.*')
        .from('fleetdrivervehicles', 'fdv')
        .where(
          'fdv.vehicleId = :vId AND fdv.status = :status AND fdv.startDate <= :today AND fdv.startTime <= :cTime AND fdv.endTime >= :cTime',
          {
            vId: vehicle.id,
            status: 'Assigned',
            today,
            cTime: currentTime,
          },
        )
        .getRawOne();

      if (driverVehicle) startDriverId = driverVehicle.fleetDriverId;

      if (vehicle.fleetGroupId) {
        const vendorUser = await this.dataSource
          .createQueryBuilder()
          .select(['vu.*', 'ut.id AS ut_id', 'ut.name AS ut_name', 'ut.startDate AS ut_startDate', 'ut.endDate AS ut_endDate'])
          .from('vendorusers', 'vu')
          .leftJoin('User_Types', 'ut', 'ut.id = vu.userTypeId')
          .where('vu.vendorId = :vendorId AND vu.fleetGroupId = :fgId', {
            vendorId: charger.vendorId,
            fgId: vehicle.fleetGroupId,
          })
          .getRawOne();

        if (vendorUser?.ut_id) {
          activeUserType = this.resolveActiveUserType({
            id: vendorUser.ut_id,
            name: vendorUser.ut_name,
            startDate: vendorUser.ut_startDate,
            endDate: vendorUser.ut_endDate,
          });
        }
      }
    } else if (vehicle.userId) {
      const vendorUser = await this.dataSource
        .createQueryBuilder()
        .select(['vu.*', 'ut.id AS ut_id', 'ut.name AS ut_name', 'ut.startDate AS ut_startDate', 'ut.endDate AS ut_endDate'])
        .from('vendorusers', 'vu')
        .leftJoin('User_Types', 'ut', 'ut.id = vu.userTypeId')
        .where('vu.vendorId = :vendorId AND vu.userId = :userId', {
          vendorId: charger.vendorId,
          userId: vehicle.userId,
        })
        .getRawOne();

      if (vendorUser?.ut_id) {
        activeUserType = this.resolveActiveUserType({
          id: vendorUser.ut_id,
          name: vendorUser.ut_name,
          startDate: vendorUser.ut_startDate,
          endDate: vendorUser.ut_endDate,
        });
      }
    }

    const qbWallet = this.dataSource
      .createQueryBuilder()
      .select('w.*')
      .from('wallets', 'w');

    if (vehicle.userId) {
      qbWallet.where('w.userId = :uId AND w.type = :type', { uId: vehicle.userId, type: 'User' });
    } else {
      qbWallet.where('w.fleetId = :fId AND w.type = :type', { fId: vehicle.fleetId, type: 'Fleet' });
    }

    const userBalance = await qbWallet.getRawOne();

    if (!userBalance || Number(userBalance.balance) <= 10) {
      return createResponse(uuid, statusMessages.Invalid, { message: 'Insufficient balance' });
    }

    const { requiredPrice, tariffType } = await this.resolveTariff(charger, activeUserType);

    if (!requiredPrice) {
      return createResponse(uuid, statusMessages.Invalid, {
        message: 'No matching tariff price type found for user',
      });
    }

    const { finalUsableAmount, energy } = await this.calculateEnergy(
      charger,
      vehicle.userId,
      vehicle.fleetId,
      userBalance,
      Number(vehicle.maxAmount) || 0,
      requiredPrice,
    );

    if (finalUsableAmount <= 0) {
      return createResponse(uuid, statusMessages.Invalid, {
        message: 'Final Usable Amount less than or equal to 0',
      });
    }

    const insertResult = await this.dataSource
      .createQueryBuilder()
      .insert()
      .into('devicetransactions')
      .values({
        connectorId: String(connectorId),
        chargerId: chargerIdStr,
        chargerRef: charger.id,
        userId: vehicle.userId || null,
        fleetId: vehicle.fleetId || null,
        startDate: new Date(),
        vehicleId: vehicle.id,
        stopDate: null,
        charginDuration: 0,
        startMeterValue: meterStart || 0,
        stopMeterValue: 0,
        totalWh: 0,
        startSoc: 0,
        stopSoc: 0,
        status: 0,
        maxEnergy: energy,
        maxAmount: finalUsableAmount,
        platform: 'VID' as any,
        isDualMode: connectorId === 0,
        calcPrice: requiredPrice.price || 0,
        calcTaxPercent: requiredPrice.gst || 0,
        startDriverId: startDriverId || null,
        tariffName: tariffType?.name ?? 'Standard',
        clientId: charger.clientId,
      })
      .execute();

    const createdTxId = insertResult.raw.insertId;
    const transactionId = generateTransactionId(createdTxId);

    await this.dataSource
      .createQueryBuilder()
      .update('devicetransactions')
      .set({ transactionId: BigInt(transactionId) as any })
      .where('id = :id', { id: createdTxId })
      .execute();

    const sessionId = sessionPrefix + crypto.randomBytes(8).toString('hex').toUpperCase();
    await this.dataSource
      .createQueryBuilder()
      .insert()
      .into('chargingsessions')
      .values({
        sessionId,
        status: 'Started' as any,
        transactionId: createdTxId,
        userId: vehicle.userId || null,
        fleetId: vehicle.fleetId || null,
        maxEnergy: energy,
        maxAmount: finalUsableAmount,
        connectorId: connectorId,
        chargerId: chargerIdStr,
        chargerRef: charger.id,
        platform: 'VID' as any,
        calcPrice: requiredPrice.price || 0,
        calcTaxPercent: requiredPrice.gst || 0,
        startDriverId: startDriverId || null,
        tariffName: tariffType?.name ?? 'Standard',
        clientId: charger.clientId,
      })
      .execute();

    const qbRfid = this.dataSource
      .createQueryBuilder()
      .select('rf.*')
      .from('rfidtags', 'rf');

    if (vehicle.userId) {
      qbRfid.where('rf.userId = :userId', { userId: vehicle.userId });
    } else {
      qbRfid.where('rf.fleetId = :fleetId', { fleetId: vehicle.fleetId });
    }

    const rfidTag = await qbRfid.getRawOne();

    const res = createResponse(
      uuid,
      statusMessages.Accepted,
      {
        expiryDate: rfidTag?.expiryDate ? new Date(rfidTag.expiryDate) : undefined,
        parentIdTag: rfidTag?.rfIdTag || '',
      },
      transactionId,
    );

    if (vehicle.userId) {
      this.sendChargingStartedNotification(
        vehicle.userId,
        '⚡ Auto Charging Started 🔋',
        'Charging has started automatically. Your vehicle is now powering up.',
        sessionId,
        transactionId,
      ).catch((err) => this.logger.error('Push notification error: ' + err.message));
    }

    this.logger.log(`VID StartTransaction: sessionId=${sessionId}, txId=${transactionId}`);
    return res;
  }

  private async handleRfidFlow(
    uuid: string,
    charger: any,
    chargerIdStr: string,
    idTag: string,
    connectorId: number,
    meterStart: number,
    sessionPrefix: string,
  ): Promise<any[]> {
    const rfidTag = await this.dataSource
      .createQueryBuilder()
      .select('rf.*')
      .from('rfidtags', 'rf')
      .where('rf.rfIdTag = :idTag AND rf.clientId = :clientId', { idTag, clientId: charger.clientId })
      .getRawOne();

    if (!rfidTag) {
      return createResponse(uuid, statusMessages.Invalid, { message: 'Invalid RFID tag' });
    }

    const todayDate = new Date();
    if (rfidTag.expiryDate) {
      const expiryEndOfDay = new Date(rfidTag.expiryDate);
      expiryEndOfDay.setHours(23, 59, 59, 999);
      if (expiryEndOfDay < todayDate) {
        return createResponse(uuid, statusMessages.Invalid, { message: 'RFID tag has expired' });
      }
    }

    const runningTx = await this.dataSource
      .createQueryBuilder()
      .select('dt.id')
      .from('devicetransactions', 'dt')
      .where('dt.chargerId = :chargerIdStr AND dt.connectorId = :connectorId AND dt.status = 0', {
        chargerIdStr,
        connectorId: String(connectorId),
      })
      .getRawOne();

    if (runningTx) {
      return createResponse(uuid, statusMessages.ConcurrentTx, { message: 'Connector is Already Occupied' });
    }

    let activeUserType: any = null;

    if (rfidTag.fleetId && rfidTag.fleetGroupId) {
      const vendorUser = await this.dataSource
        .createQueryBuilder()
        .select(['vu.*', 'ut.id AS ut_id', 'ut.name AS ut_name', 'ut.startDate AS ut_startDate', 'ut.endDate AS ut_endDate'])
        .from('vendorusers', 'vu')
        .leftJoin('User_Types', 'ut', 'ut.id = vu.userTypeId')
        .where('vu.vendorId = :vendorId AND vu.fleetGroupId = :fgId', {
          vendorId: charger.vendorId,
          fgId: rfidTag.fleetGroupId,
        })
        .getRawOne();

      if (vendorUser?.ut_id) {
        activeUserType = this.resolveActiveUserType({
          id: vendorUser.ut_id,
          name: vendorUser.ut_name,
          startDate: vendorUser.ut_startDate,
          endDate: vendorUser.ut_endDate,
        });
      }
    } else if (rfidTag.userId) {
      const vendorUser = await this.dataSource
        .createQueryBuilder()
        .select(['vu.*', 'ut.id AS ut_id', 'ut.name AS ut_name', 'ut.startDate AS ut_startDate', 'ut.endDate AS ut_endDate'])
        .from('vendorusers', 'vu')
        .leftJoin('User_Types', 'ut', 'ut.id = vu.userTypeId')
        .where('vu.vendorId = :vendorId AND vu.userId = :userId', {
          vendorId: charger.vendorId,
          userId: rfidTag.userId,
        })
        .getRawOne();

      if (vendorUser?.ut_id) {
        activeUserType = this.resolveActiveUserType({
          id: vendorUser.ut_id,
          name: vendorUser.ut_name,
          startDate: vendorUser.ut_startDate,
          endDate: vendorUser.ut_endDate,
        });
      }
    }

    const qbWallet = this.dataSource
      .createQueryBuilder()
      .select('w.*')
      .from('wallets', 'w');

    if (rfidTag.userId) {
      qbWallet.where('w.userId = :uId AND w.type = :type', { uId: rfidTag.userId, type: 'User' });
    } else {
      qbWallet.where('w.fleetId = :fId AND w.type = :type', { fId: rfidTag.fleetId, type: 'Fleet' });
    }

    const userBalance = await qbWallet.getRawOne();

    if (!userBalance || Number(userBalance.balance) <= 10) {
      return createResponse(uuid, statusMessages.Invalid, { message: 'Insufficient balance' });
    }

    const { requiredPrice, tariffType } = await this.resolveTariff(charger, activeUserType);

    if (!requiredPrice) {
      return createResponse(uuid, statusMessages.Invalid, {
        message: 'No matching tariff price type found for user',
      });
    }

    const { finalUsableAmount, energy } = await this.calculateEnergy(
      charger,
      rfidTag.userId,
      rfidTag.fleetId,
      userBalance,
      Number(rfidTag.maxAmount) || 0,
      requiredPrice,
    );

    if (finalUsableAmount <= 0) {
      return createResponse(uuid, statusMessages.Invalid, {
        message: 'Final Usable Amount less than or equal to 0',
      });
    }

    const insertResult = await this.dataSource
      .createQueryBuilder()
      .insert()
      .into('devicetransactions')
      .values({
        connectorId: String(connectorId),
        chargerId: chargerIdStr,
        chargerRef: charger.id,
        userId: rfidTag.userId || null,
        fleetId: rfidTag.fleetId || null,
        startDate: new Date(),
        stopDate: null,
        charginDuration: 0,
        startMeterValue: meterStart || 0,
        stopMeterValue: 0,
        totalWh: 0,
        startSoc: 0,
        stopSoc: 0,
        status: 0,
        maxEnergy: energy,
        maxAmount: finalUsableAmount,
        platform: 'RFID' as any,
        isDualMode: connectorId === 0,
        calcPrice: requiredPrice.price || 0,
        calcTaxPercent: requiredPrice.gst || 0,
        rfidTag: rfidTag.rfIdTag,
        tariffName: tariffType?.name ?? 'Standard',
        clientId: charger.clientId,
      })
      .execute();

    const createdTxId = insertResult.raw.insertId;
    const transactionId = generateTransactionId(createdTxId);

    await this.dataSource
      .createQueryBuilder()
      .update('devicetransactions')
      .set({ transactionId: BigInt(transactionId) as any })
      .where('id = :id', { id: createdTxId })
      .execute();

    const sessionId = sessionPrefix + crypto.randomBytes(8).toString('hex').toUpperCase();
    await this.dataSource
      .createQueryBuilder()
      .insert()
      .into('chargingsessions')
      .values({
        sessionId,
        status: 'Started' as any,
        transactionId: createdTxId,
        userId: rfidTag.userId || null,
        fleetId: rfidTag.fleetId || null,
        maxEnergy: energy,
        maxAmount: finalUsableAmount,
        connectorId: connectorId,
        chargerId: chargerIdStr,
        chargerRef: charger.id,
        platform: 'RFID' as any,
        calcPrice: requiredPrice.price || 0,
        calcTaxPercent: requiredPrice.gst || 0,
        rfidTag: rfidTag.rfIdTag,
        tariffName: tariffType?.name ?? 'Standard',
        clientId: charger.clientId,
      })
      .execute();

    const res = createResponse(
      uuid,
      statusMessages.Accepted,
      {
        expiryDate: rfidTag.expiryDate ? new Date(rfidTag.expiryDate) : undefined,
        parentIdTag: rfidTag.rfIdTag || '',
      },
      transactionId,
    );

    if (rfidTag.userId) {
      this.sendChargingStartedNotification(
        rfidTag.userId,
        '⚡ Charging Started via RFID 🔋',
        'Charging has been initiated using RFID. Your vehicle is now powering up.',
        sessionId,
        transactionId,
      ).catch((err) => this.logger.error('Push notification error: ' + err.message));
    }

    this.logger.log(`RFID StartTransaction: sessionId=${sessionId}, txId=${transactionId}`);
    return res;
  }

  private resolveActiveUserType(userType: any): any {
    if (!userType) return null;
    const today = toDateOnly(new Date());
    const start = toDateOnly(userType.startDate);
    const end = toDateOnly(userType.endDate);
    if ((!start || today! >= start) && (!end || today! <= end)) {
      return userType;
    }
    return null;
  }

  private async resolveTariff(
    charger: any,
    activeUserType: any,
  ): Promise<{ requiredPrice: any; tariffType: any }> {
    let requiredPrice: any = null;
    let tariffType: any = null;

    if (activeUserType) {
      requiredPrice = await this.dataSource
        .createQueryBuilder()
        .select('t.*')
        .from('tariffs', 't')
        .where('t.vendorId = :vId AND t.chargerId = :chId AND t.userTypeId = :utId', {
          vId: charger.vendorId,
          chId: charger.id,
          utId: activeUserType.id,
        })
        .getRawOne();
    }

    if (!requiredPrice) {
      requiredPrice = await this.dataSource
        .createQueryBuilder()
        .select('t.*')
        .from('tariffs', 't')
        .where('t.vendorId = :vId AND t.chargerId = :chId AND t.userTypeId IS NULL', {
          vId: charger.vendorId,
          chId: charger.id,
        })
        .getRawOne();
    }

    if (requiredPrice?.userTypeId) {
      tariffType = await this.dataSource
        .createQueryBuilder()
        .select('ut.*')
        .from('User_Types', 'ut')
        .where('ut.id = :id', { id: requiredPrice.userTypeId })
        .getRawOne();
    }

    return { requiredPrice, tariffType };
  }

  private async calculateEnergy(
    charger: any,
    userId: number | null | undefined,
    fleetId: number | null | undefined,
    userBalance: any,
    maxAmountFromEntity: number,
    requiredPrice: any,
  ): Promise<{ finalUsableAmount: number; energy: number; usableAmount: number }> {
    const gst = Number(requiredPrice.gst || 0);
    const pricePerKw = Number(requiredPrice.price || 0);
    const walletAmount = Number(userBalance.balance);

    const maxAllowedAmount =
      maxAmountFromEntity > 0 && maxAmountFromEntity < walletAmount ? maxAmountFromEntity : walletAmount;

    const qbSum = this.dataSource
      .createQueryBuilder()
      .select('SUM(dt.maxAmount)', 'sum')
      .from('devicetransactions', 'dt')
      .where('dt.status = 0');

    if (userId) {
      qbSum.andWhere('dt.userId = :userId', { userId });
    } else if (fleetId) {
      qbSum.andWhere('dt.fleetId = :fleetId', { fleetId });
    }

    const totalUsed = await qbSum.getRawOne();
    const totalUsedAmount = Number(totalUsed?.sum || 0);
    const remainingBalance = walletAmount - totalUsedAmount;
    const usableAmount = remainingBalance < maxAllowedAmount ? remainingBalance : maxAllowedAmount;

    if (parseInt(String(usableAmount)) <= 0) {
      return { finalUsableAmount: 0, energy: 0, usableAmount };
    }

    const clientDetails = await this.dataSource
      .createQueryBuilder()
      .select('cd.preConvDeductionAmount')
      .from('clientdetails', 'cd')
      .where('cd.clientId = :clientId', { clientId: charger.clientId })
      .getRawOne();

    const deduction = Number(clientDetails?.preConvDeductionAmount || 0);
    const finalUsableAmount = deduction > 0 ? usableAmount - deduction : usableAmount;
    const energy = amountToEnergyConversion(finalUsableAmount, gst, pricePerKw, true);

    return { finalUsableAmount, energy, usableAmount };
  }

  /** Mirrors `handleStartTransaction.js`'s three `globalSinglePushNotification` call sites (session/VID/RFID flows). */
  private async sendChargingStartedNotification(
    userId: number,
    title: string,
    message: string,
    sessionId: string,
    transactionId: number,
  ): Promise<void> {
    const user = await this.dataSource
      .createQueryBuilder()
      .select(['u.fcmToken', 'u.clientId'])
      .from('users', 'u')
      .where('u.id = :userId', { userId })
      .getRawOne();

    if (!user?.fcmToken) return;

    await this.firebaseService.sendToClient(user.clientId, user.fcmToken, {
      title,
      body: { sessionId, transactionId, message },
      type: 'charging-start',
    });
  }

  /** Mirrors `OCPI/CPOExport/commandsModule.js:handleStartResult` — tells the roaming eMSP partner
   *  that the RemoteStart it requested actually resulted in a real StartTransaction at the charger. */
  private async notifyOcpiStartResult(sessionId: string): Promise<void> {
    const session = await this.dataSource
      .createQueryBuilder()
      .select(['cs.msp_res_url AS msp_res_url', 'cs.emspId AS emspId'])
      .from('chargingsessions', 'cs')
      .where('cs.sessionId = :sessionId', { sessionId })
      .getRawOne();

    if (!session?.msp_res_url || !session?.emspId) return;

    const msp = await this.dataSource
      .createQueryBuilder()
      .select('e.token_b', 'token_b')
      .from('ocpiemsps', 'e')
      .where('e.id = :id', { id: session.emspId })
      .getRawOne();

    if (!msp?.token_b) return;

    const authToken = Buffer.from(msp.token_b, 'utf8').toString('base64');
    const resultData = {
      result: 'ACCEPTED',
      message: [{ language: 'en', text: 'Session Started Successfully' }],
    };

    try {
      await postMethodOcpi(session.msp_res_url, resultData, authToken);
    } catch (error: any) {
      this.logger.error(`OCPI start-result POST failed for session ${sessionId}: ${error.message}`);
    }
  }

  /** Mirrors `OCPP/payAndChargeFeature/payAndChargeHandler.js:handleDataTransferPayAndCharge`. */
  private async handleQrPayPostStart(charger: any, deviceTransaction: any, ws: WebSocket): Promise<void> {
    const chargerSpecification = await this.dataSource
      .createQueryBuilder()
      .select(['cs.vendorName'])
      .from('chargerspecifications', 'cs')
      .where('cs.chargerId = :chargerId AND cs.chargerRef = :chargerRef', { chargerId: charger.chargerId, chargerRef: charger.id })
      .getRawOne();

    const messageId = `Gun${Number(deviceTransaction.connectorId)}EnergyQuota`;

    const reqToCharger = [
      2,
      randomUUID(),
      'DataTransfer',
      {
        vendorId: chargerSpecification?.vendorName || 'NexinEv',
        messageId,
        data: {
          transactionId: deviceTransaction.transactionId,
          connectorId: deviceTransaction.connectorId,
          energyLimit: deviceTransaction.maxEnergy,
          timestamp: new Date().toISOString(),
        },
      },
    ];

    await this.ocppLogger.logData(reqToCharger, charger.chargerId, 2, 'DataTransfer');
    ws.send(JSON.stringify(reqToCharger));
  }
}
