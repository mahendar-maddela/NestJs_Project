import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class BootNotificationHandlerV16 {
  private readonly logger = new Logger(BootNotificationHandlerV16.name);

  constructor(private readonly dataSource: DataSource) {}

  async handle(message: any[], chargerIdStr: string): Promise<any[]> {
    const uuid = message[1];
    try {
      const charger = await this.dataSource
        .createQueryBuilder()
        .select('c.*')
        .from('chargers', 'c')
        .where('c.chargerId = :chargerIdStr', { chargerIdStr })
        .getRawOne();

      if (!charger) {
        return [3, uuid, { status: 'Rejected', currentTime: new Date().toISOString() }];
      }

      await this.dataSource
        .createQueryBuilder()
        .update('chargers')
        .set({ status: 'Active' as any })
        .where('id = :id', { id: charger.id })
        .execute();

      const specifications = message[3] || {};

      const existingSpec = await this.dataSource
        .createQueryBuilder()
        .select('cs.*')
        .from('chargerspecifications', 'cs')
        .where('cs.chargerRef = :chargerRef', { chargerRef: charger.id })
        .getRawOne();

      if (existingSpec) {
        const specMappings = [
          { chargerSpecKey: 'chargePointVendor', specificKey: 'vendorName' },
          { chargerSpecKey: 'chargePointModel', specificKey: 'model' },
          { chargerSpecKey: 'chargeBoxSerialNumber', specificKey: 'serial' },
          { chargerSpecKey: 'firmwareVersion', specificKey: 'firmwareVersion' },
          { chargerSpecKey: 'chargePointSerialNumber', specificKey: 'cpSerial' },
          { chargerSpecKey: 'iccid', specificKey: 'iccid' },
          { chargerSpecKey: 'imsi', specificKey: 'imsi' },
          { chargerSpecKey: 'meterType', specificKey: 'meterType' },
          { chargerSpecKey: 'meterSerialNumber', specificKey: 'meterSerialNumber' },
        ];

        const updates: any = {};
        specMappings.forEach(({ chargerSpecKey, specificKey }) => {
          if (specifications[chargerSpecKey] && specifications[chargerSpecKey] !== (existingSpec as any)[specificKey]) {
            updates[specificKey] = specifications[chargerSpecKey];
          }
        });

        if (Object.keys(updates).length > 0) {
          await this.dataSource
            .createQueryBuilder()
            .update('chargerspecifications')
            .set(updates)
            .where('id = :id', { id: existingSpec.id })
            .execute();
        }
      } else {
        await this.dataSource
          .createQueryBuilder()
          .insert()
          .into('chargerspecifications')
          .values({
            chargerId: chargerIdStr,
            vendorName: specifications.chargePointVendor,
            model: specifications.chargePointModel,
            serial: specifications.chargeBoxSerialNumber,
            firmwareVersion: specifications.firmwareVersion,
            cpSerial: specifications.chargePointSerialNumber,
            meterType: specifications.meterType,
            meterSerialNumber: specifications.meterSerialNumber,
            iccid: specifications.iccid,
            imsi: specifications.imsi,
            chargerRef: charger.id,
          })
          .execute();
      }

      const hbConfig = await this.dataSource
        .createQueryBuilder()
        .select('cc.*')
        .from('chargerconfigurations', 'cc')
        .where('cc.chargerRef = :chargerRef AND cc.configName = :configName', {
          chargerRef: charger.id,
          configName: 'HeartbeatInterval',
        })
        .getRawOne();

      const interval = hbConfig?.configValue ? parseInt(hbConfig.configValue, 10) : 60;

      return [3, uuid, { status: 'Accepted', currentTime: new Date().toISOString(), interval }];
    } catch (err: any) {
      this.logger.error(`Error handling BootNotification v1.6 for ${chargerIdStr}: ${err.message}`);
      return [3, uuid, { status: 'Accepted', currentTime: new Date().toISOString(), message: 'Backend Server Issue' }];
    }
  }
}
