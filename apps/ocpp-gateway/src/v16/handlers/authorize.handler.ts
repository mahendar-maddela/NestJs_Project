import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

const statusMessages = {
  Accepted: 'Accepted',
  Blocked: 'Blocked',
  Expired: 'Expired',
  Invalid: 'Invalid',
  ConcurrentTx: 'ConcurrentTx',
};

const createResponse = (uid: string, status: string, additionalInfo: any = {}) => {
  return [
    3,
    uid,
    {
      idTagInfo: {
        status,
        ...additionalInfo,
      },
    },
  ];
};

@Injectable()
export class AuthorizeHandlerV16 {
  private readonly logger = new Logger(AuthorizeHandlerV16.name);

  constructor(private readonly dataSource: DataSource) { }

  async handle(message: any[], chargerIdStr: string): Promise<any[]> {
    const uuid = message[1];
    try {
      const idTag = message.find((item: any) => item && item.idTag)?.idTag;
      if (!idTag) {
        return createResponse(uuid, statusMessages.Invalid);
      }

      const charger = await this.dataSource
        .createQueryBuilder()
        .select(['c.id', 'c.chargerId', 'c.vendorId', 'c.clientId'])
        .from('chargers', 'c')
        .where('c.chargerId = :chargerIdStr', { chargerIdStr })
        .getOne();

      if (!charger) {
        return createResponse(uuid, statusMessages.Invalid);
      }

      const prefixConfig = await this.dataSource
        .createQueryBuilder()
        .select('pc.session')
        .from('prefixconfigs', 'pc')
        .where('pc.clientId = :clientId', { clientId: charger.clientId })
        .getRawOne();

      const sessionPrefix = prefixConfig?.session || 'NEX';

      if (idTag.startsWith(sessionPrefix)) {
        const session = await this.dataSource
          .createQueryBuilder()
          .select('cs.id')
          .from('chargingsessions', 'cs')
          .where('cs.sessionId = :sessionId AND cs.clientId = :clientId', {
            sessionId: idTag,
            clientId: charger.clientId,
          })
          .getRawOne();

        return session
          ? createResponse(uuid, statusMessages.Accepted)
          : createResponse(uuid, statusMessages.Invalid);
      }

      if (idTag.startsWith('VID')) {
        const vid = idTag.split(':')[1];
        if (!vid) {
          return createResponse(uuid, statusMessages.Invalid);
        }

        // Mirrors legacy's `Vendor.findByPk(..., { include: [{ model: Feature, where: { name: 'Auto Charge' }, required: true }] })` —
        // VID auto-authorize is gated on the charger's vendor actually having the Auto Charge feature enabled.
        const autoChargeFeature = await this.dataSource
          .createQueryBuilder()
          .select('f.id', 'id')
          .from('features', 'f')
          .andWhere('f.name = :featureName', { featureName: 'Auto Charge', })
          .innerJoin('featurepermissions', 'fp', 'fp.featureId = f.id',)
          .where('fp.vendorId = :vendorId', { vendorId: charger.vendorId, })
          .getRawOne();

        console.log("asdasdasd", autoChargeFeature, charger.vendorId,)

        if (!autoChargeFeature) {
          return createResponse(uuid, statusMessages.Invalid);
        }

        const vehicle = await this.dataSource
          .createQueryBuilder()
          .select('v.id')
          .from('vehicles', 'v')
          .where('v.vinNumber = :vid AND v.autoCharge = 1 AND v.clientId = :clientId', {
            vid,
            clientId: charger.clientId,
          })
          .getRawOne();

        return vehicle
          ? createResponse(uuid, statusMessages.Accepted)
          : createResponse(uuid, statusMessages.Invalid);
      }

      const rfidTag = await this.dataSource
        .createQueryBuilder()
        .select(['rf.*', 'mt.rfIdTag AS masterTagIdTag'])
        .from('rfidtags', 'rf')
        .leftJoin('rfidtags', 'mt', 'mt.id = rf.masterRfidTag')
        .where('rf.rfIdTag = :idTag AND rf.clientId = :clientId', { idTag, clientId: charger.clientId })
        .getRawOne();

      if (!rfidTag) {
        return createResponse(uuid, statusMessages.Invalid);
      }

      const todayDate = new Date();
      if (rfidTag.expiryDate) {
        const expiryEndOfDay = new Date(rfidTag.expiryDate);
        expiryEndOfDay.setHours(23, 59, 59, 999);
        if (expiryEndOfDay < todayDate) {
          return createResponse(uuid, statusMessages.Expired);
        }
      }

      const masterTagStr = rfidTag.masterTagIdTag;
      const expireAfter = new Date(Date.now() + 10 * 60 * 1000);

      return createResponse(uuid, statusMessages.Accepted, {
        ...(masterTagStr ? { parentIdTag: masterTagStr } : {}),
        expiryDate: expireAfter,
      });
    } catch (err: any) {
      this.logger.error(`Error handling Authorize v1.6 for ${chargerIdStr}: ${err.message}`);
      return [
        3,
        uuid,
        {
          idTagInfo: { status: statusMessages.Invalid },
          message: 'Rejected Backend Server Issue',
          currentTime: new Date().toISOString(),
        },
      ];
    }
  }
}
