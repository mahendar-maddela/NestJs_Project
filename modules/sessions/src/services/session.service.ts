import { Injectable, NotFoundException } from '@nestjs/common';
import { SessionRepository } from '../repositories/session.repository';

/** Mirrors `controllers/admin/chargingSessionController.js`. */
@Injectable()
export class SessionService {
  constructor(private readonly sessionRepository: SessionRepository) {}

  async getAllSessions(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [rows, count] = await this.sessionRepository.findAndCountAllAdmin(skip, limit);

    return {
      success: true,
      message: 'Sessions fetched successfully',
      sessions: rows,
      pagination: { totalPages: Math.ceil(count / limit), page },
    };
  }

  async getSessionByChargerId(chargerPkId: number, clientId: number, page: number, limit: number) {
    const charger = await this.sessionRepository.findChargerByIdAndClient(chargerPkId, clientId);
    if (!charger) {
      throw new NotFoundException({ success: false, msg: 'Charger not found' });
    }

    const skip = (page - 1) * limit;
    const [rows, count] = await this.sessionRepository.findAndCountByChargerBusinessId(charger.chargerId, skip, limit);

    // const sessions = rows.map((row: any) => {
    //   const { transaction, ...rest } = row;
    //   return { ...rest, transaction: deviceTransaction };
    // });

    return {
      success: true,
      message: 'Sessions fetched successfully',
      sessions:rows,
      pagination: { totalPages: Math.ceil(count / limit), page },
    };
  }
}
