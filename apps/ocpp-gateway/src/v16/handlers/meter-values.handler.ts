import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { FirebaseService } from '@integrations/firebase';
import { OcppLoggerService } from '../../common/services/ocpp-logger.service';
import { OcpiIntegrationService } from '../../common/services/ocpi-integration.service';
import { RealtimeBridgeService } from '../../common/services/realtime-bridge.service';

@Injectable()
export class MeterValuesHandlerV16 {
  private readonly logger = new Logger(MeterValuesHandlerV16.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly firebaseService: FirebaseService,
    private readonly ocppLogger: OcppLoggerService,
    private readonly ocpiIntegration: OcpiIntegrationService,
    private readonly realtimeBridge: RealtimeBridgeService,
  ) {}

  async handle(message: any[], chargerIdStr: string, ws: WebSocket): Promise<any[]> {
    const uuid = message[1];
    const { connectorId, transactionId, meterValue } = message[3] || {};

    try {
      if (!transactionId) {
        return [3, uuid, {}];
      }

      const meterValues: any[] = meterValue || [];
      const sampledValues: any[] = meterValues[0]?.sampledValue || [];

      const findValue = (measurand: string, location?: string): number => {
        return (
          sampledValues.find(
            (item: any) =>
              item.measurand === measurand &&
              (location && item.location ? item.location === location : true),
          )?.value || 0
        );
      };

      const meterData = {
        meterValue: findValue('Energy.Active.Import.Register', 'Outlet'),
        soc: findValue('SoC'),
        temperature: findValue('Temperature', 'Cable'),
        voltage: findValue('Voltage', 'Outlet'),
        voltageEv: findValue('Voltage', 'EV'),
        currentImport: findValue('Current.Import', 'Outlet'),
        currentImportEv: findValue('Current.Import', 'EV'),
        currentOffered: findValue('Current.Offered', 'Outlet'),
        powerOffered: findValue('Power.Active.Import', 'Outlet'),
      };

      const deviceTransaction = await this.dataSource
        .createQueryBuilder()
        .select('dt.*')
        .from('devicetransactions', 'dt')
        .where('dt.transactionId = :transactionId', { transactionId: Number(transactionId) })
        .getRawOne();

      if (!deviceTransaction) {
        return [3, uuid, {}];
      }

      const session = await this.dataSource
        .createQueryBuilder()
        .select('cs.*')
        .from('chargingsessions', 'cs')
        .where('cs.transactionId = :txId', { txId: deviceTransaction.id })
        .getRawOne();

      if (!session) {
        return [3, uuid, {}];
      }

      const isTransactionBegin =
        sampledValues.some((v: any) => v.context === 'Transaction.Begin') ||
        meterValues[0]?.sampledValue?.[0]?.context === 'Transaction.Begin';

      if (isTransactionBegin) {
        await this.dataSource
          .createQueryBuilder()
          .update('devicetransactions')
          .set({ startSoc: Number(meterData.soc) })
          .where('id = :id', { id: deviceTransaction.id })
          .execute();
      } else {
        const chargingPercentage = Number(meterData.soc);
        if (session.userId && [80, 90, 95, 100].includes(chargingPercentage)) {
          if (Number(deviceTransaction.stopSoc) !== chargingPercentage) {
            this.sendSocPushNotification(
              session.userId,
              session.sessionId ?? 'unknown',
              transactionId,
              chargingPercentage,
            ).catch((err) => this.logger.error('SOC push error: ' + err.message));
          }
        }

        // `createdAt` can come back as an unparseable/zero timestamp for stale or malformed rows —
        // NaN written to a numeric column makes mysql2 emit it unquoted ("Unknown column 'NaN'").
        const createdAtMs = new Date(deviceTransaction.createdAt).getTime();
        const chargingDuration = Number.isFinite(createdAtMs) ? Date.now() - createdAtMs : 0;
        let stopMeterValue: number;
        let totalWh: number;
        let usedMeterValue: number;
        let meterValueStore: number | undefined;

        if (deviceTransaction.isDualMode) {
          const calculatedValue =
            Number(deviceTransaction.meterValueStore || 0) + Number(meterData.meterValue);
          stopMeterValue = calculatedValue;
          usedMeterValue = calculatedValue - Number(deviceTransaction.startMeterValue || 0);
          totalWh = usedMeterValue;
          meterValueStore = Number(meterData.meterValue);
        } else {
          usedMeterValue =
            Number(meterData.meterValue) - Number(deviceTransaction.startMeterValue || 0);
          stopMeterValue = Number(meterData.meterValue);
          totalWh = parseFloat(usedMeterValue.toFixed(3));
        }

        const updateData: any = {
          stopSoc: Number(meterData.soc),
          charginDuration: chargingDuration,
          stopMeterValue,
          totalWh,
        };
        if (meterValueStore !== undefined) updateData.meterValueStore = meterValueStore;

        await this.dataSource
          .createQueryBuilder()
          .update('devicetransactions')
          .set(updateData)
          .where('id = :id', { id: deviceTransaction.id })
          .execute();

        if (session.platform === 'OCPI' && deviceTransaction.status !== 1) {
          setImmediate(() => {
            this.patchOcpiSessionOnMeterValue(session, deviceTransaction, chargerIdStr).catch(
              (err) => this.logger.error('OCPI patch session on meter value failed: ' + err.message),
            );
          });
        }

        if (usedMeterValue / 1000 >= Number(deviceTransaction.maxEnergy) && deviceTransaction.status === 0) {
          const reqSent = [2, uuidv4(), 'RemoteStopTransaction', { transactionId: parseInt(String(transactionId)) }];

          await this.dataSource
            .createQueryBuilder()
            .update('devicetransactions')
            .set({ stopFrom: 'SERVER' as any, reason: 'Max Energy Reached' })
            .where('id = :id', { id: deviceTransaction.id })
            .execute();

          await this.dataSource
            .createQueryBuilder()
            .update('chargingsessions')
            .set({ stopFrom: 'SERVER' as any, reason: 'Max Energy Reached' })
            .where('id = :id', { id: session.id })
            .execute();

          this.logger.log(`Max energy reached for tx ${transactionId}, sending RemoteStop`);
          await this.ocppLogger.logData(reqSent, chargerIdStr, 1, 'RemoteStopTransaction');
          ws.send(JSON.stringify(reqSent));
        }

        if (
          session.maxChargingPercentage &&
          Number(meterData.soc) >= Number(session.maxChargingPercentage)
        ) {
          const reqSent = [2, uuidv4(), 'RemoteStopTransaction', { transactionId: parseInt(String(transactionId)) }];

          await this.dataSource
            .createQueryBuilder()
            .update('devicetransactions')
            .set({ stopFrom: 'SERVER' as any, reason: 'Max Percentage Reached' })
            .where('id = :id', { id: deviceTransaction.id })
            .execute();

          await this.dataSource
            .createQueryBuilder()
            .update('chargingsessions')
            .set({ stopFrom: 'SERVER' as any, reason: 'Max Percentage Reached' })
            .where('id = :id', { id: session.id })
            .execute();

          this.logger.log(`Max percentage reached for tx ${transactionId}, sending RemoteStop`);
          await this.ocppLogger.logData(reqSent, chargerIdStr, 1, 'RemoteStopTransaction');
          ws.send(JSON.stringify(reqSent));
        }
      }

      // Mirrors legacy `handleMeterValues.js`'s `io.to(session.sessionId).emit('meterValue', message)`
      this.realtimeBridge.emitToRoom(session.sessionId, 'meterValue', message).catch((err) =>
        this.logger.error(`Realtime meterValue emit failed for session ${session.sessionId}: ${err.message}`),
      );

      await this.dataSource
        .createQueryBuilder()
        .insert()
        .into('transactiondetails')
        .values({
          chargerId: chargerIdStr,
          transactionId: BigInt(transactionId),
          transactionRef: deviceTransaction.id,
          temperature: meterData.temperature ? Number(meterData.temperature) : null,
          voltage: meterData.voltage ? Number(meterData.voltage) : null,
          voltageEv: meterData.voltageEv ? Number(meterData.voltageEv) : null,
          batteryPercentage: meterData.soc ? Number(meterData.soc) : null,
          currentImport: meterData.currentImport ? Number(meterData.currentImport) : null,
          currentImportEv: meterData.currentImportEv ? Number(meterData.currentImportEv) : null,
          currentOffered: meterData.currentOffered ? Number(meterData.currentOffered) : null,
          meterValue: meterData.meterValue ? Number(meterData.meterValue) : null,
          powerOffered: meterData.powerOffered ? Number(meterData.powerOffered) : null,
        })
        .execute();

      return [3, uuid, {}];
    } catch (err: any) {
      this.logger.error(`Error handling MeterValues v1.6 for charger ${chargerIdStr}: ${err.message}`);
      return [3, uuid, {}];
    }
  }

  /** Mirrors `handleMeterValues.js`'s OCPI branch — PATCHes the in-progress session's running total to the eMSP. */
  private async patchOcpiSessionOnMeterValue(
    session: any,
    deviceTransaction: any,
    chargerIdStr: string,
  ): Promise<void> {
    try {
      const clientDetails = await this.dataSource
        .createQueryBuilder()
        .select(['cd.id', 'cd.clientId', 'cd.partyId'])
        .from('clientdetails', 'cd')
        .where('cd.clientId = :clientId', { clientId: session.clientId })
        .getRawOne();

      const charger = await this.dataSource
        .createQueryBuilder()
        .select(['c.id', 'c.chargerId', 'c.clientId', 'c.vendorId'])
        .from('chargers', 'c')
        .where('c.id = :id', { id: session.chargerRef })
        .getRawOne();

      if (!charger) return;

      let requiredPrice: any = null;
      if (session.emspId) {
        requiredPrice = await this.dataSource
          .createQueryBuilder()
          .select('rt.*')
          .from('roamingtariffs', 'rt')
          .where('rt.chargerId = :chId AND rt.clientId = :cId AND rt.emspId = :eId', {
            chId: charger.id,
            cId: charger.clientId,
            eId: session.emspId,
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

      const price = Number(requiredPrice?.price || 0);
      const gst = Number(requiredPrice?.gst || 0);
      const totalKWh = Number(deviceTransaction.totalWh) / 1000;
      const amount = price * totalKWh;
      const gstAmount = gst > 0 ? (gst * amount) / 100 : 0;

      if (!clientDetails?.partyId) {
        this.logger.error(`OCPI meter-value patch: no partyId configured for clientId=${session.clientId}`);
        return;
      }

      await this.ocpiIntegration.patchSession(
        session,
        deviceTransaction,
        requiredPrice?.id,
        amount,
        gstAmount,
        'UPDATE',
        clientDetails.partyId,
      );
    } catch (err: any) {
      this.logger.error('patchOcpiSessionOnMeterValue error: ' + err.message);
    }
  }

  private async sendSocPushNotification(
    userId: number,
    sessionId: string,
    transactionId: number,
    percentage: number,
  ): Promise<void> {
    const user = await this.dataSource
      .createQueryBuilder()
      .select(['u.id', 'u.fcmToken', 'u.clientId'])
      .from('users', 'u')
      .where('u.id = :userId', { userId })
      .getRawOne();

    if (!user?.fcmToken) return;

    await this.firebaseService.sendToClient(user.clientId, user.fcmToken, {
      title: `🔋 Charging at ${percentage}%`,
      type: 'charging-soc',
      body: {
        sessionId,
        transactionId,
        message: `Your vehicle is now ${percentage}% charged. You're almost ready to go.`,
      },
    });
  }
}
