import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class OcppLoggerService {
  private readonly logger = new Logger(OcppLoggerService.name);

  constructor(private readonly dataSource: DataSource) {}

  async logData(
    message: unknown,
    chargerId: string,
    senderId: number,
    type?: string,
  ): Promise<void> {
    try {
      const from = senderId === 1 ? 'Charger' : senderId === 2 ? 'CMS' : 'Error';

      let finalLogType = 'Unknown';

      if (from === 'Charger') {
        if (Array.isArray(message) && typeof message[2] === 'string') {
          finalLogType = message[2];
        }
      } else if (from === 'CMS') {
        finalLogType = type ?? 'Unknown';
      } else {
        finalLogType = 'Error';
      }

      await this.dataSource
        .createQueryBuilder()
        .insert()
        .into('logs')
        .values({
          timestamp: new Date().toISOString(),
          logType: finalLogType,
          log: JSON.stringify(message),
          chargerId,
          from,
          error: senderId === 3,
        })
        .execute();
    } catch (error) {
      this.logger.error(
        `Failed to store OCPP log for charger ${chargerId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}