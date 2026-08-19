import { Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { RedisService } from '@app/redis';
import { QR_REFUND_REQUEST_CHANNEL, QrRefundRequestPayload } from '@app/common';
import { FirebaseService } from '@integrations/firebase';
import { postMethodOcpi } from '@modules/ocpi/src/utils/ocpi-http.util';
import { OCPI_CONFIG } from '@modules/ocpi/src/constants/ocpi.constants';
import { OcpiIntegrationService } from '../../common/services/ocpi-integration.service';
import { RealtimeBridgeService } from '../../common/services/realtime-bridge.service';

const statusMessages = {
  Accepted: 'Accepted',
  Invalid: 'Invalid',
};

const buildResponse = (uuid: string, status: string) => [
  3,
  uuid,
  {
    idTagInfo: { status },
  },
];

@Injectable()
export class StopTransactionHandlerV16 {
  private readonly logger = new Logger(StopTransactionHandlerV16.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
    private readonly firebaseService: FirebaseService,
    private readonly ocpiIntegration: OcpiIntegrationService,
    private readonly realtimeBridge: RealtimeBridgeService,
  ) { }

  async handle(
    message: any[],
  ): Promise<any[] | { status: number; message: string }> {
    const uuid = message[1];
    const {
      transactionId,
      idTag,
      meterStop,
      reason,
      transactionData,
      isAbnormalAdminStop,
    } = message[3] || {};

    try {
      // Mirrors legacy's `sequelize.transaction()` wrapping the whole handler — every write below
      // (device transaction, session, wallet balance + ledger entry) must commit or roll back together.
      return await this.dataSource.transaction(async (manager) => {
        const startSoc =
          transactionData?.[0]?.sampledValue?.find(
            (item: any) =>
              item.context === 'Transaction.Begin' && item.measurand === 'SoC',
          )?.value || 0;

        const stopSoc =
          transactionData?.[0]?.sampledValue?.find(
            (item: any) =>
              item.context === 'Transaction.End' && item.measurand === 'SoC',
          )?.value || 0;

        const deviceTransaction = await manager
          .createQueryBuilder()
          .select('dt.*')
          .from('devicetransactions', 'dt')
          .where('dt.transactionId = :transactionId', { transactionId: Number(transactionId) })
          .getRawOne();

        if (!deviceTransaction) {
          if (isAbnormalAdminStop) return { status: 500, message: 'Not stopped session stopped failed' };
          return buildResponse(uuid, statusMessages.Invalid);
        }

        if (deviceTransaction.status === 1) {
          if (isAbnormalAdminStop) return { status: 500, message: 'Not stopped session stopped failed' };
          return buildResponse(uuid, statusMessages.Invalid);
        }

        const session = await manager
          .createQueryBuilder()
          .select('cs.*')
          .from('chargingsessions', 'cs')
          .where('cs.transactionId = :txId', { txId: deviceTransaction.id })
          .getRawOne();

        if (!session) {
          if (isAbnormalAdminStop) return { status: 500, message: 'Not stopped session stopped failed' };
          return buildResponse(uuid, statusMessages.Invalid);
        }

        const startMeter = Number(deviceTransaction.startMeterValue || 0);
        const previousMeter = Number(deviceTransaction.stopMeterValue || 0);
        const currentStopMeter = Number(meterStop || 0);
        const lastMeterValue = Math.max(currentStopMeter, previousMeter);
        const totalWh = Math.max(lastMeterValue - startMeter, 0);

        // `createdAt` can come back as an unparseable/zero timestamp for stale or malformed rows —
        // NaN written to a numeric column makes mysql2 emit it unquoted ("Unknown column 'NaN'").
        const createdAtMs = new Date(deviceTransaction.createdAt).getTime();
        const charginDuration = Number.isFinite(createdAtMs) ? Date.now() - createdAtMs : 0;

        await manager
          .createQueryBuilder()
          .update('devicetransactions')
          .set({
            stopDate: new Date(),
            reason: deviceTransaction.reason ?? reason ?? null,
            stopFrom: (deviceTransaction.stopFrom ?? (reason === 'Local' ? 'RFID' : 'CHARGER')) as any,
            startSoc: Number(startSoc) > 0 ? Number(startSoc) : deviceTransaction.startSoc,
            stopSoc: Number(stopSoc) > 0 ? Number(stopSoc) : deviceTransaction.stopSoc,
            totalWh,
            stopMeterValue: lastMeterValue,
            charginDuration,
          })
          .where('id = :id', { id: deviceTransaction.id })
          .execute();

        const charger = await manager
          .createQueryBuilder()
          .select(['c.*', 's.id AS station_id', 's.stationUniqueId AS station_stationUniqueId', 's.name AS station_name'])
          .from('chargers', 'c')
          .leftJoin('stations', 's', 's.id = c.stationId')
          .where('c.chargerId = :chargerId', { chargerId: deviceTransaction.chargerId ?? '' })
          .getRawOne();

        let user: any = null;
        let tariffType: any = null;
        let requiredPrice: any = null;
        let userBalance: any = null;

        const platform = session.platform;

        if (platform === 'OCPI') {
          requiredPrice = await manager
            .createQueryBuilder()
            .select('rt.*')
            .from('roamingtariffs', 'rt')
            .where('rt.chargerId = :chId AND rt.clientId = :cId AND rt.emspId = :eId', {
              chId: charger?.id,
              cId: charger?.clientId,
              eId: session.emspId,
            })
            .getRawOne();

          if (!requiredPrice && charger) {
            requiredPrice = await manager
              .createQueryBuilder()
              .select('t.*')
              .from('tariffs', 't')
              .where('t.vendorId = :vId AND t.chargerId = :chId AND t.userTypeId IS NULL', {
                vId: charger.vendorId,
                chId: charger.id,
              })
              .getRawOne();
          }
        } else if (platform === 'QRPAY') {
          requiredPrice = await manager
            .createQueryBuilder()
            .select('rt.*')
            .from('roamingtariffs', 'rt')
            .where('rt.chargerId = :chId AND rt.clientId = :cId AND rt.tariffType = :tType AND rt.importClientId IS NULL AND rt.emspId IS NULL', {
              chId: charger?.id,
              cId: charger?.clientId,
              tType: 'QRPAY',
            })
            .getRawOne();

          if (!requiredPrice && charger) {
            requiredPrice = await manager
              .createQueryBuilder()
              .select('t.*')
              .from('tariffs', 't')
              .where('t.vendorId = :vId AND t.chargerId = :chId AND t.userTypeId IS NULL', {
                vId: charger.vendorId,
                chId: charger.id,
              })
              .getRawOne();
          }
        } else if (platform === 'ROAMING') {
          requiredPrice = await manager
            .createQueryBuilder()
            .select('rt.*')
            .from('roamingtariffs', 'rt')
            .where('rt.chargerId = :chId AND rt.clientId = :cId AND rt.importClientId = :impId', {
              chId: charger?.id,
              cId: charger?.clientId,
              impId: session.initiatedClientId,
            })
            .getRawOne();

          if (!requiredPrice && charger) {
            requiredPrice = await manager
              .createQueryBuilder()
              .select('t.*')
              .from('tariffs', 't')
              .where('t.vendorId = :vId AND t.chargerId = :chId AND t.userTypeId IS NULL', {
                vId: charger.vendorId,
                chId: charger.id,
              })
              .getRawOne();
          }

          if (deviceTransaction.userId) {
            user = await manager
              .createQueryBuilder()
              .select(['u.id', 'u.userId', 'u.first_name', 'u.fcmToken', 'u.clientId'])
              .from('users', 'u')
              .where('u.id = :id', { id: deviceTransaction.userId })
              .getRawOne();
          }

          const qbW = manager.createQueryBuilder().select('w.*').from('wallets', 'w');
          if (deviceTransaction.userId) {
            qbW.where('w.userId = :uId AND w.type = :type', { uId: deviceTransaction.userId, type: 'User' });
          } else {
            qbW.where('w.fleetId = :fId AND w.type = :type', { fId: deviceTransaction.fleetId, type: 'Fleet' });
          }
          userBalance = await qbW.getRawOne();

          if (!userBalance) {
            return buildResponse(uuid, statusMessages.Invalid);
          }
        } else {
          if (deviceTransaction.userId) {
            user = await manager
              .createQueryBuilder()
              .select(['u.id', 'u.userId', 'u.first_name', 'u.fcmToken', 'u.clientId'])
              .from('users', 'u')
              .where('u.id = :id', { id: deviceTransaction.userId })
              .getRawOne();
          } else {
            user = await manager
              .createQueryBuilder()
              .select(['fud.id', 'fud.fleetUId', 'fud.clientId'])
              .from('fleetuserdetails', 'fud')
              .where('fud.id = :id', { id: deviceTransaction.fleetId })
              .getRawOne();
          }

          const qbW = manager.createQueryBuilder().select('w.*').from('wallets', 'w');
          if (deviceTransaction.userId) {
            qbW.where('w.userId = :uId AND w.type = :type', { uId: deviceTransaction.userId, type: 'User' });
          } else {
            qbW.where('w.fleetId = :fId AND w.type = :type', { fId: deviceTransaction.fleetId, type: 'Fleet' });
          }
          userBalance = await qbW.getRawOne();

          if (!userBalance) {
            return buildResponse(uuid, statusMessages.Invalid);
          }

          let activeUserType: any = null;

          if (charger) {
            if (deviceTransaction.userId) {
              const vendorUser = await manager
                .createQueryBuilder()
                .select(['vu.*', 'ut.id AS ut_id', 'ut.name AS ut_name', 'ut.startDate AS ut_startDate', 'ut.endDate AS ut_endDate'])
                .from('vendorusers', 'vu')
                .leftJoin('User_Types', 'ut', 'ut.id = vu.userTypeId')
                .where('vu.vendorId = :vId AND vu.userId = :uId', {
                  vId: charger.vendorId,
                  uId: deviceTransaction.userId,
                })
                .getRawOne();

              if (vendorUser?.ut_id) {
                const toDateOnly = (d: any) => (d ? new Date(d).setHours(0, 0, 0, 0) : null);
                const today = toDateOnly(new Date());
                const start = toDateOnly(vendorUser.ut_startDate);
                const end = toDateOnly(vendorUser.ut_endDate);
                if ((!start || today! >= start) && (!end || today! <= end)) {
                  activeUserType = { id: vendorUser.ut_id, name: vendorUser.ut_name };
                }
              }
            } else if (deviceTransaction.fleetId) {
              const vehicle = await manager
                .createQueryBuilder()
                .select('v.fleetGroupId')
                .from('vehicles', 'v')
                .where('v.id = :id', { id: deviceTransaction.vehicleId })
                .getRawOne();

              if (vehicle?.fleetGroupId) {
                const vendorUser = await manager
                  .createQueryBuilder()
                  .select(['vu.*', 'ut.id AS ut_id', 'ut.name AS ut_name', 'ut.startDate AS ut_startDate', 'ut.endDate AS ut_endDate'])
                  .from('vendorusers', 'vu')
                  .leftJoin('User_Types', 'ut', 'ut.id = vu.userTypeId')
                  .where('vu.vendorId = :vId AND vu.fleetGroupId = :fgId', {
                    vId: charger.vendorId,
                    fgId: vehicle.fleetGroupId,
                  })
                  .getRawOne();

                if (vendorUser?.ut_id) {
                  const toDateOnly = (d: any) => (d ? new Date(d).setHours(0, 0, 0, 0) : null);
                  const today = toDateOnly(new Date());
                  const start = toDateOnly(vendorUser.ut_startDate);
                  const end = toDateOnly(vendorUser.ut_endDate);
                  if ((!start || today! >= start) && (!end || today! <= end)) {
                    activeUserType = { id: vendorUser.ut_id, name: vendorUser.ut_name };
                  }
                }
              }
            }

            if (activeUserType) {
              requiredPrice =
                (await manager
                  .createQueryBuilder()
                  .select('t.*')
                  .from('tariffs', 't')
                  .where('t.vendorId = :vId AND t.chargerId = :chId AND t.userTypeId = :utId', {
                    vId: charger.vendorId,
                    chId: charger.id,
                    utId: activeUserType.id,
                  })
                  .getRawOne()) ||
                (await manager
                  .createQueryBuilder()
                  .select('t.*')
                  .from('tariffs', 't')
                  .where('t.vendorId = :vId AND t.chargerId = :chId AND t.userTypeId IS NULL', {
                    vId: charger.vendorId,
                    chId: charger.id,
                  })
                  .getRawOne());
            } else {
              requiredPrice = await manager
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
              tariffType = await manager
                .createQueryBuilder()
                .select('ut.*')
                .from('User_Types', 'ut')
                .where('ut.id = :id', { id: requiredPrice.userTypeId })
                .getRawOne();
            }
          }
        }

        const price = Number(requiredPrice?.price || 0);
        const gst = Number(requiredPrice?.gst || 0);
        const totalKWh = totalWh / 1000;
        const amount = price * totalKWh;
        const gstAmount = gst > 0 ? (gst * amount) / 100 : 0;
        const totalAmount = amount + gstAmount;

        const resolvedTariffName =
          platform === 'ROAMING'
            ? 'ROAMING'
            : platform === 'QRPAY'
              ? 'QR_PAYMENT_TARIFF'
              : tariffType
                ? tariffType.name
                : 'Standard';

        await manager
          .createQueryBuilder()
          .update('devicetransactions')
          .set({
            status: 1,
            gst: gstAmount > 0 ? gstAmount : 0,
            amount: amount > 0 ? amount : 0,
            price: totalAmount > 0 ? totalAmount : 0,
            tariffName: resolvedTariffName,
          })
          .where('id = :id', { id: deviceTransaction.id })
          .execute();

        if (platform === 'OCPI') {
          await this.handleOcpiStop(manager, session, deviceTransaction, requiredPrice, charger, amount, gstAmount, totalKWh, stopSoc, uuid);
        } else if (platform === 'QRPAY') {
          await this.handleQrPayStop(manager, session, deviceTransaction, totalAmount);
        } else {
          await this.handleWalletDeduction(manager, userBalance, totalAmount, deviceTransaction, charger, user);
        }

        await manager
          .createQueryBuilder()
          .update('chargingsessions')
          .set({
            reason: session.reason ?? reason ?? 'Other',
            stopFrom: (session.stopFrom ?? (reason === 'Local' ? 'RFID' : 'CHARGER')) as any,
            status: 'Completed' as any,
            tariffName: resolvedTariffName,
          })
          .where('id = :id', { id: session.id })
          .execute();

        // Mirrors legacy `handleStopTransaction.js`'s `io.to(session.sessionId).emit('StopTransaction', message)`
        // (legacy skips the emit for OCPI sessions — the OCPI receiver handles those itself).
        if (session.platform !== 'OCPI') {
          this.realtimeBridge.emitToRoom(session.sessionId, 'StopTransaction', message).catch((err) =>
            this.logger.error(`Realtime StopTransaction emit failed for session ${session.sessionId}: ${err.message}`),
          );
        }

        if (deviceTransaction.userId && user?.fcmToken) {
          this.firebaseService
            .sendToClient(user.clientId, user.fcmToken, {
              title: '⚡ Charging Stopped ',
              type: 'charging-end',
              body: {
                sessionId: session.sessionId,
                transactionId: deviceTransaction.transactionId,
                price: totalAmount,
                message: `Your charging session has ended. Thank you for charging with us. Total billed: ₹${totalAmount}.`,
              },
            })
            .catch((err) => this.logger.error('Push notification error: ' + err.message));
        }

        if (isAbnormalAdminStop) {
          return { status: 200, message: 'Not stopped session stopped successfully' };
        }

        return buildResponse(uuid, statusMessages.Accepted);
      });
    } catch (err: any) {
      this.logger.error(`StopTransaction error for tx ${transactionId}: ${err.message}`, err.stack);
      const { isAbnormalAdminStop: abnormal } = message[3] || {};
      if (abnormal) return { status: 500, message: 'Not stopped session stopped failed' };
      return buildResponse(uuid, statusMessages.Invalid);
    }
  }

  /** Mirrors `handleStopTransaction.js`'s OCPI branch: stop-accepted callback to the eMSP, the
   *  session PATCH (`patchSessionOnStop`), and CDR generation/send (`createCDRFromSession` +
   *  `sendCdrResponse`). */
  private async handleOcpiStop(
    manager: EntityManager,
    session: any,
    deviceTransaction: any,
    requiredPrice: any,
    charger: any,
    amount: number,
    gstAmount: number,
    totalKWh: number,
    stopSoc: number,
    uuid: string,
  ): Promise<void> {
    if (session.msp_res_url && session.stopFrom === 'OCPI') {
      try {
        const emsp = await manager
          .createQueryBuilder()
          .select(['e.id', 'e.token_b'])
          .from('ocpiemsps', 'e')
          .where('e.id = :id', { id: session.emspId })
          .getRawOne();

        if (emsp?.token_b) {
          const mspAuthToken = Buffer.from(emsp.token_b, 'utf8').toString('base64');
          const responseObj = {
            result: 'ACCEPTED',
            message: [{ language: 'en', text: 'Stop Accepted By the Charger' }],
          };
          await postMethodOcpi(session.msp_res_url, responseObj, mspAuthToken);
        }
      } catch (err: any) {
        this.logger.error('OCPI MSP stop response error: ' + err.message);
      }
    }

    const clientDetails = await manager
      .createQueryBuilder()
      .select(['cd.partyId'])
      .from('clientdetails', 'cd')
      .where('cd.clientId = :clientId', { clientId: session.clientId })
      .getRawOne();

    if (!clientDetails?.partyId) {
      this.logger.error(`OCPI stop: no partyId configured for clientId=${session.clientId}, skipping session PATCH/CDR`);
      return;
    }

    try {
      await this.ocpiIntegration.patchSession(session, deviceTransaction, requiredPrice?.id, amount, gstAmount, 'STOP', clientDetails.partyId);
    } catch (err: any) {
      this.logger.error('OCPI patchSession on stop failed: ' + err.message);
    }

    try {
      const cdrData = {
        country_code: OCPI_CONFIG.country_code,
        party_id: clientDetails.partyId,
        start_date_time: deviceTransaction.startDate,
        end_date_time: new Date().toISOString(),
        auth_method: 'COMMAND',
        location_id: `${charger.station_id}_${charger.station_stationUniqueId}`,
        evse_uid: deviceTransaction.chargerRef,
        connector_id: deviceTransaction.connectorId,
        total_energy: totalKWh,
        charging_periods: [
          {
            start_date_time: new Date(deviceTransaction.startDate).toISOString(),
            dimensions: [
              { type: 'ENERGY', volume: parseFloat(String(totalKWh)) || 0.0 },
              { type: 'STATE_OF_CHARGE', volume: parseInt(String(stopSoc), 10) },
            ],
            tariff_id: `${requiredPrice?.id}`,
          },
        ],
        currency: 'INR',
        total_cost: { excl_vat: amount, incl_vat: amount + gstAmount },
        remark: deviceTransaction.reason,
        tariff_id: requiredPrice?.id,
      };

      const cdr = await this.ocpiIntegration.createCdrFromSession(session, cdrData);
      if (cdr) {
        await this.ocpiIntegration.sendCdrResponse(cdr, session.emspId);
      }
    } catch (err: any) {
      this.logger.error('OCPI CDR generation/send failed: ' + err.message);
    }
  }

  private async handleQrPayStop(
    manager: EntityManager,
    session: any,
    deviceTransaction: any,
    totalAmount: number,
  ): Promise<void> {
    if (Number(totalAmount) > Number(deviceTransaction.maxAmount)) {
      await manager
        .createQueryBuilder()
        .update('devicetransactions')
        .set({
          isOverConsumedQr: true,
          pendingRecoveryAmountQr: totalAmount - Number(deviceTransaction.maxAmount),
        })
        .where('id = :id', { id: deviceTransaction.id })
        .execute();
    }

    if (Number(session.maxAmount) > totalAmount) {
      const remainingAmount = Number(session.maxAmount) - Number(totalAmount);
      if (remainingAmount >= 1) {
        await this.publishRefundRequest({
          sessionRowId: session.id,
          paymentTransactionId: session.paymentTransactionId,
          clientId: session.clientId,
          sessionCode: session.sessionId,
          referenceId: String(deviceTransaction.transactionId),
          refundAmount: Number(remainingAmount.toFixed(2)),
          reason: 'Refund issued for remaining amount',
          newStatus: session.status,
        }).catch((err) => this.logger.error(`QRPAY refund publish failed for session ${deviceTransaction.transactionId}: ${err.message}`));
      } else {
        this.logger.warn('QRPAY refund skipped. Remaining amount is less than ₹1.');
      }
    }
  }

  /** Mirrors `refundPayAndChargeAmount`'s trigger point — apps/api owns the actual Razorpay call (see QrRefundListenerService). */
  private async publishRefundRequest(payload: QrRefundRequestPayload): Promise<void> {
    await this.redisService.publish(QR_REFUND_REQUEST_CHANNEL, JSON.stringify(payload));
  }

  private async handleWalletDeduction(
    manager: EntityManager,
    userBalance: any,
    totalAmount: number,
    deviceTransaction: any,
    charger: any,
    user: any,
  ): Promise<void> {
    const deduction = totalAmount > 0 ? totalAmount : 0;

    const clientPrefix = await manager
      .createQueryBuilder()
      .select('pc.wallet')
      .from('prefixconfigs', 'pc')
      .where('pc.clientId = :clientId', { clientId: user?.clientId ?? deviceTransaction.clientId })
      .getRawOne();

    await manager
      .createQueryBuilder()
      .update('wallets')
      .set({ balance: () => `balance - ${deduction}` })
      .where('id = :id', { id: userBalance.id })
      .execute();

    const updatedWallet = await manager
      .createQueryBuilder()
      .select('w.balance')
      .from('wallets', 'w')
      .where('w.id = :id', { id: userBalance.id })
      .getRawOne();

    await manager
      .createQueryBuilder()
      .insert()
      .into('wallettransactions')
      .values({
        type: 'Debit' as any,
        walletId: userBalance.id,
        amount: totalAmount > 0 ? totalAmount : 0,
        refNo: `${clientPrefix?.wallet ?? ''}${deviceTransaction.transactionId}`,
        chargerId: charger?.id || null,
        note: 'Charging Stopped',
        transactionPurpose: 'Charging' as any,
        sourceType: 'Wallet' as any,
        remainingBalance: updatedWallet?.balance ?? 0,
        transactionRef: deviceTransaction.id,
        userType: (deviceTransaction.userId ? 'User' : 'Fleet') as any,
        clientId: deviceTransaction.initiatedClientId || deviceTransaction.clientId,
      })
      .execute();
  }
}
