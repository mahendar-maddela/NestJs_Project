import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { getMethodOcpi } from 'modules/ocpi/src/utils/ocpi-http.util';
import { encodeBase64 } from 'modules/ocpi/src/utils/ocpi-response.util';
import { OCPI_CURR_VERSION } from 'modules/ocpi/src/constants/ocpi.constants';
import { OcpiHealthRepository } from '../repositories/ocpi-health.repository';

/** Mirrors `connectedCposCheck` (every 5 minutes) in legacy `utils/cronJob.js` -> `ImportEmsp/sessionHandler.js:requestSessions`. */
@Injectable()
export class OcpiHealthCron {
  private readonly logger = new Logger(OcpiHealthCron.name);

  constructor(private readonly repo: OcpiHealthRepository) {}

  @Cron('*/5 * * * *')
  async handleCheckCpoConnections(): Promise<void> {
    try {
      const cpos = await this.repo.findCposToCheck();
      if (!cpos.length) return;

      for (const cpo of cpos) {
        try {
          const version = await this.repo.findVersion(cpo.id, OCPI_CURR_VERSION);
          if (!version) {
            await this.repo.updateCpoStatus(cpo.id, 'OFFLINE');
            continue;
          }

          const endpoint = await this.repo.findLocationsSenderEndpoint(version.id);
          if (!endpoint || !endpoint.url) {
            this.logger.log(`No session endpoint for CPO ${cpo.id}`);
            await this.repo.updateCpoStatus(cpo.id, 'OFFLINE');
            continue;
          }

          const tokenB = encodeBase64(cpo.token_b);
          let response;
          try {
            response = await getMethodOcpi(`${endpoint.url}?offset=0&limit=10`, tokenB);
          } catch (error: any) {
            this.logger.error(`Error checking CPO ${cpo.id}: ${error.message}`);
            await this.repo.updateCpoStatus(cpo.id, 'OFFLINE');
            continue;
          }

          if (!response?.data || response.data.status_code !== 1000) {
            this.logger.log(`Invalid response for CPO ${cpo.id}`);
            await this.repo.updateCpoStatus(cpo.id, 'OFFLINE');
            continue;
          }

          if (cpo.status !== 'CONNECTED') {
            await this.repo.updateCpoStatus(cpo.id, 'CONNECTED');
          }
        } catch (err: any) {
          this.logger.error(`Error checking CPO ${cpo.id}: ${err.message}`);
          await this.repo.updateCpoStatus(cpo.id, 'OFFLINE');
        }
      }
    } catch (error: any) {
      this.logger.error(`Error in requestSessions: ${error.message}`);
    }
  }
}
