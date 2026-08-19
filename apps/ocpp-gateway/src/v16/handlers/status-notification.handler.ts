import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { patchMethodOcpi } from '@modules/ocpi/src/utils/ocpi-http.util';
import { mapChargerStatus } from '@modules/ocpi/src/utils/ocpi-convert.util';
import { RealtimeBridgeService } from '../../common/services/realtime-bridge.service';
import { OCPI_CONFIG, OCPI_ROLES, OCPI_IDENTIFIERS, OCPI_CURR_VERSION } from '@modules/ocpi/src/constants/ocpi.constants';

const statusHandlers = (status: string): string => {
  switch (status) {
    case 'Finishing':
      return 'Your charging session has been completed. You are being redirected to the home page.';
    case 'Preparing':
      return 'Gun Connected, You can Start Now ...';
    case 'Charging':
      return 'Charging has started.';
    case 'Reserved':
      return 'The connector is reserved.';
    case 'Faulted':
      return 'Sorry for the inconvenience. We will resolve the problem as soon as possible.';
    case 'Unavailable':
      return 'Sorry for the inconvenience, the connector is unavailable.';
    case 'Available':
      return 'The connector is available now. Please connect and use.';
    case 'SuspendedEV':
      return 'Sorry for the inconvenience. We will resolve the problem as soon as possible.';
    default:
      return 'Unknown status.';
  }
};

@Injectable()
export class StatusNotificationHandlerV16 {
  private readonly logger = new Logger(StatusNotificationHandlerV16.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly realtimeBridge: RealtimeBridgeService,
  ) {}

  async handle(
    message: any[],
    chargerIdStr: string,
  ): Promise<{ response: any[] }> {
    const uuid = message[1];
    const { connectorId, status, errorCode, info, vendorErrorCode } = message[3] || {};

    try {
      const charger = await this.dataSource
        .createQueryBuilder()
        .select(['c.id', 'c.chargerId', 'c.status', 'c.clientId', 's.id AS station_id', 's.stationUniqueId AS station_stationUniqueId'])
        .from('chargers', 'c')
        .leftJoin('stations', 's', 's.id = c.stationId')
        .where('c.chargerId = :chargerIdStr', { chargerIdStr })
        .getRawOne();

      if (!charger) {
        return { response: [3, uuid, {}] };
      }

      const connector = await this.dataSource
        .createQueryBuilder()
        .select(['cn.id', 'cn.connectorId', 'cn.chargerId', 'cn.status'])
        .from('connectors', 'cn')
        .where('cn.chargerId = :chargerId AND cn.connectorId = :connectorId', {
          chargerId: charger.id,
          connectorId: String(connectorId),
        })
        .getRawOne();

      if (connector) {
        await this.dataSource
          .createQueryBuilder()
          .update('connectors')
          .set({
            status: status as any,
            info: info || 'No Error',
          })
          .where('id = :id', { id: connector.id })
          .execute();

        // Mirrors legacy `handleStatusNotification.js`'s `io.to(chargerId).emit('status', { status, userMessage })`
        const userMessage = statusHandlers(status);
        this.realtimeBridge.emitToRoom(chargerIdStr, 'status', { status, userMessage }).catch((err) =>
          this.logger.error(`Realtime status emit failed for charger ${chargerIdStr}: ${err.message}`),
        );

        if (charger.status !== 'Active') {
          await this.dataSource
            .createQueryBuilder()
            .update('chargers')
            .set({ status: 'Active' as any })
            .where('id = :id', { id: charger.id })
            .execute();
        }

        if (status === 'Available') {
          await this.dataSource
            .createQueryBuilder()
            .update('chargingsessions')
            .set({ status: 'NotStarted' as any })
            .where(
              'chargerId = :chargerId AND connectorId = :connectorId AND status IN (:...statuses) AND platform NOT IN (:...platforms)',
              {
                chargerId: charger.chargerId,
                connectorId: Number(connectorId),
                statuses: ['Initiated'],
                platforms: ['QRPAY'],
              },
            )
            .execute();

          const activeTransaction = await this.dataSource
            .createQueryBuilder()
            .select(['dt.id'])
            .from('devicetransactions', 'dt')
            .where('dt.chargerId = :chargerId AND dt.connectorId = :connectorId AND dt.status = 0', {
              chargerId: charger.chargerId,
              connectorId: String(connectorId),
            })
            .getRawOne();

          if (activeTransaction) {
            await this.dataSource
              .createQueryBuilder()
              .update('devicetransactions')
              .set({ isAbnormalStop: true })
              .where('id = :id', { id: activeTransaction.id })
              .execute();
          }
        }
      }

      if (charger.station_id) {
        setImmediate(() => {
          this.patchOcpiStatus(
            charger.station_id,
            charger.station_stationUniqueId ?? '',
            charger.chargerId,
            status,
            connectorId,
            charger.clientId,
          ).catch((err) =>
            this.logger.error('OCPI status patch error: ' + err.message),
          );
        });
      }

      return { response: [3, uuid, {}] };
    } catch (err: any) {
      this.logger.error(
        `Error handling StatusNotification v1.6 for charger ${chargerIdStr}: ${err.message}`,
      );
      return { response: [4, uuid, {}] };
    }
  }

  /** Mirrors legacy `locationModule.js:patchStatusToConnectedEmsps` — for every CONNECTED eMSP that
   *  has pulled this station, resolve their published `locations` receiver endpoint and PATCH the
   *  connector status to it. */
  private async patchOcpiStatus(
    stationId: number,
    stationUniqueId: string,
    chargerId: string,
    status: string,
    connectorId: number,
    clientId: number,
  ): Promise<void> {
    const stationUid = `${stationId}_${stationUniqueId}`;

    const charger = await this.dataSource
      .createQueryBuilder()
      .select(['c.id'])
      .from('chargers', 'c')
      .where('c.chargerId = :chargerId', { chargerId })
      .getRawOne();

    if (!charger) return;

    const emsps = await this.dataSource
      .createQueryBuilder()
      .select(['e.id', 'e.token_b', 'e.clientId'])
      .from('ocpiemsps', 'e')
      .innerJoin('ocpipushstations', 'ps', 'ps.emspId = e.id AND ps.chargerId = :chId', { chId: charger.id })
      .where('e.status = :status AND e.clientId = :clientId', { status: 'CONNECTED', clientId })
      .getRawMany();

    if (emsps.length === 0) return;

    for (const msp of emsps) {
      const ocpiVersion = await this.dataSource
        .createQueryBuilder()
        .select(['v.id'])
        .from('ocpiversions', 'v')
        .where('v.emspId = :emspId AND v.version = :version', { emspId: msp.id, version: OCPI_CURR_VERSION })
        .getRawOne();

      if (!ocpiVersion) continue;

      const endpoint = await this.dataSource
        .createQueryBuilder()
        .select(['ve.url'])
        .from('ocpiversionendpoints', 've')
        .where('ve.versionId = :versionId AND ve.identifier = :identifier AND ve.role = :role', {
          versionId: ocpiVersion.id,
          identifier: OCPI_IDENTIFIERS.locations,
          role: OCPI_ROLES.receiver,
        })
        .getRawOne();

      if (!endpoint) continue;

      const clientDetails = await this.dataSource
        .createQueryBuilder()
        .select(['cd.partyId'])
        .from('clientdetails', 'cd')
        .where('cd.clientId = :clientId', { clientId: msp.clientId })
        .getRawOne();

      if (!clientDetails) continue;

      const patchLocationUrl = `${endpoint.url}/${OCPI_CONFIG.country_code}/${clientDetails.partyId}/${stationUid}/${chargerId}_${connectorId}`;
      const tokenB = Buffer.from(msp.token_b, 'utf8').toString('base64');
      const payload = { status: mapChargerStatus(status), last_updated: new Date().toISOString() };
      const startTime = Date.now();

      try {
        const response = await patchMethodOcpi(patchLocationUrl, payload, tokenB);
        await this.logOcpiStatusPatch({
          request_body: JSON.stringify(payload),
          response_body: JSON.stringify(response.data),
          endpoint: patchLocationUrl,
          status_code: response.status,
          response_time_ms: Date.now() - startTime,
          emspId: msp.id,
        });
      } catch (err: any) {
        this.logger.error(`OCPI status patch to eMSP ${msp.id} failed: ${err.message}`);
        await this.logOcpiStatusPatch({
          request_body: JSON.stringify(payload),
          response_body: JSON.stringify(err?.response?.data ?? { message: err.message }),
          endpoint: patchLocationUrl,
          status_code: err?.response?.status ?? 500,
          response_time_ms: Date.now() - startTime,
          emspId: msp.id,
        });
      }
    }
  }

  private async logOcpiStatusPatch(data: {
    request_body: string;
    response_body: string;
    endpoint: string;
    status_code: number;
    response_time_ms: number;
    emspId: number;
  }): Promise<void> {
    try {
      await this.dataSource
        .createQueryBuilder()
        .insert()
        .into('ocpilogs')
        .values({ ...data, request_type: 'PATCH', from: 'SERVER' as any })
        .execute();
    } catch (err: any) {
      this.logger.error('OCPI log insert failed: ' + err.message);
    }
  }
}
