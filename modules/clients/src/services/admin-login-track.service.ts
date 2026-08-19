import { Injectable } from '@nestjs/common';
import { AdminLoginTrackRepository } from '../repositories/admin-login-track.repository';

/** Mirrors `controllers/admin/loginTrackController.js:getLoginTracks`. */
@Injectable()
export class AdminLoginTrackService {
  constructor(private readonly repo: AdminLoginTrackRepository) {}

  async getLoginTracks(clientId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [rows, count] = await this.repo.findAndCountPaginated(clientId, process.env.SOFTWARELOGIN, skip, limit);

    return {
      success: true,
      message: 'Login tracks fetched successfully',
      data: rows,
      pagination: { totalPages: Math.ceil(count / limit), page },
    };
  }
}
