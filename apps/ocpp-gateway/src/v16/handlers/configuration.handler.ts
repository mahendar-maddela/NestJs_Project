import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class ConfigurationHandlerV16 {
  private readonly logger = new Logger(ConfigurationHandlerV16.name);

  constructor(private readonly dataSource: DataSource) {}

  async handle(message: any[], chargerIdStr: string): Promise<void> {
    try {
      const configNames: any[] = message?.[2]?.configurationKey;

      if (!Array.isArray(configNames) || configNames.length === 0) {
        return;
      }

      const charger = await this.dataSource
        .createQueryBuilder()
        .select('c.id')
        .from('chargers', 'c')
        .where('c.chargerId = :chargerIdStr', { chargerIdStr })
        .getRawOne();

      if (!charger) {
        this.logger.warn(`Charger not found: ${chargerIdStr}`);
        return;
      }

      for (const name of configNames) {
        if (!name?.key) continue;

        const existing = await this.dataSource
          .createQueryBuilder()
          .select('cc.id')
          .from('chargerconfigurations', 'cc')
          .where('cc.chargerRef = :chargerRef AND cc.configName = :configName', {
            chargerRef: charger.id,
            configName: name.key,
          })
          .getRawOne();

        if (existing) {
          await this.dataSource
            .createQueryBuilder()
            .update('chargerconfigurations')
            .set({
              configValue: name.value != null ? String(name.value) : null,
              accessibility: name.readonly ? 'R' : 'RW',
            })
            .where('id = :id', { id: existing.id })
            .execute();
        } else {
          await this.dataSource
            .createQueryBuilder()
            .insert()
            .into('chargerconfigurations')
            .values({
              chargerId: chargerIdStr,
              chargerRef: charger.id,
              configName: name.key,
              configValue: name.value != null ? String(name.value) : null,
              accessibility: name.readonly ? 'R' : 'RW',
            })
            .execute();
        }
      }
    } catch (err: any) {
      this.logger.error(`Error handling configurations v1.6 for ${chargerIdStr}: ${err.message}`);
    }
  }
}
