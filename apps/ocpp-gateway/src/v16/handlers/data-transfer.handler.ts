import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { OcppLoggerService } from '../../common/services/ocpp-logger.service';

@Injectable()
export class DataTransferHandlerV16 {
  private readonly logger = new Logger(DataTransferHandlerV16.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly ocppLogger: OcppLoggerService,
  ) {}

  async handle(message: any[], chargerIdStr: string, ws: WebSocket): Promise<any[]> {
    const uuid = message[1];

    try {
      const payload =
        typeof message?.[3]?.data === 'string'
          ? JSON.parse(message[3].data)
          : message?.[3]?.data;

      const macId: string | null =
        (payload?.mac?.toUpperCase().split(':')?.[1]) || null;

      const transactionId: number | undefined = payload?.transactionId;
      const isVehicleId = message[3]?.messageId === 'VehicleMac';

      const sendResponse = (status: string) => [3, uuid, { status }];

      if (!isVehicleId || !macId) {
        return sendResponse('Accepted');
      }

      const charger = await this.dataSource
        .createQueryBuilder()
        .select(['c.id', 'c.chargerId', 'c.vendorId', 'c.clientId'])
        .from('chargers', 'c')
        .where('c.chargerId = :chargerIdStr', { chargerIdStr })
        .getRawOne();

      if (!charger) {
        return sendResponse('Accepted');
      }

      const vehicle = await this.dataSource
        .createQueryBuilder()
        .select('v.*')
        .from('vehicles', 'v')
        .where('v.vinNumber = :macId AND v.clientId = :clientId', {
          macId,
          clientId: charger.clientId,
        })
        .getRawOne();

      const qb = this.dataSource
        .createQueryBuilder()
        .select('dt.*')
        .from('devicetransactions', 'dt')
        .where('dt.status = 0 AND dt.chargerId = :chargerIdStr', { chargerIdStr })
        .orderBy('dt.createdAt', 'DESC');

      if (transactionId) {
        qb.andWhere('dt.transactionId = :transactionId', { transactionId });
      }

      const deviceTransaction = await qb.getRawOne();

      if (!deviceTransaction) {
        return sendResponse('Rejected');
      }

      let startDriverId: number | null = null;

      if (vehicle && deviceTransaction.fleetId) {
        const now = new Date();
        const today = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const currentTime = now.toLocaleTimeString('en-GB', {
          timeZone: 'Asia/Kolkata',
          hour12: false,
        });

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

        startDriverId = driverVehicle?.fleetDriverId ?? null;
      }

      await this.dataSource
        .createQueryBuilder()
        .update('devicetransactions')
        .set({
          macId,
          vehicleId: vehicle?.id || null,
          startDriverId,
        })
        .where('id = :id', { id: deviceTransaction.id })
        .execute();

      const isVehicleMismatch =
        macId &&
        deviceTransaction.fleetId &&
        deviceTransaction.platform === 'RFID' &&
        !startDriverId &&
        (!vehicle || deviceTransaction.fleetId !== vehicle.fleetId);

      if (isVehicleMismatch) {
        const session = await this.dataSource
          .createQueryBuilder()
          .select('cs.id')
          .from('chargingsessions', 'cs')
          .where('cs.transactionId = :txId', { txId: deviceTransaction.id })
          .getRawOne();

        const reqSent = [
          2,
          uuidv4(),
          'RemoteStopTransaction',
          { transactionId: Number(transactionId) },
        ];

        await this.dataSource
          .createQueryBuilder()
          .update('devicetransactions')
          .set({ stopFrom: 'SERVER' as any, reason: 'Vehicle Mismatch' })
          .where('id = :id', { id: deviceTransaction.id })
          .execute();

        if (session) {
          await this.dataSource
            .createQueryBuilder()
            .update('chargingsessions')
            .set({ stopFrom: 'SERVER' as any, reason: 'Vehicle Mismatch' })
            .where('id = :id', { id: session.id })
            .execute();
        }

        this.logger.warn(
          `Vehicle mismatch for tx ${deviceTransaction.transactionId}, charger ${chargerIdStr} — sending RemoteStop`,
        );
        await this.ocppLogger.logData(reqSent, chargerIdStr, 1, 'RemoteStopTransaction');
        ws.send(JSON.stringify(reqSent));
      }

      return sendResponse('Accepted');
    } catch (err: any) {
      this.logger.error(`DataTransfer error for charger ${chargerIdStr}: ${err.message}`);
      return [3, uuid, { status: 'Accepted' }];
    }
  }
}
