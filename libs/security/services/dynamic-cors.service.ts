import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientDetails } from '../../../modules/clients/src/entities/client-details.entity';
import { STATIC_CORS_ALLOWLIST } from '../constants/cors-allowlist.constant';

export type CorsOriginCallback = (err: Error | null, allow?: boolean) => void;

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;


/**
 * Dynamic, cached CORS allowlist: every client's CSMS/CPO/Fleet/Web-portal URLs
 * (from `ClientDetails`) plus a static allowlist, refreshed on a timer.
 * Mirrors legacy `server.js:loadClientUrls` + `dynamicCors`, matching multi-tenant
 * clients each owning their own frontend origin.
 */
@Injectable()
export class DynamicCorsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DynamicCorsService.name);
  private cachedOrigins: ReadonlySet<string> = new Set(STATIC_CORS_ALLOWLIST);
  private refreshTimer?: ReturnType<typeof setInterval>;

  constructor(@InjectRepository(ClientDetails) private readonly clientDetailsRepo: Repository<ClientDetails>) {}

  async onModuleInit(): Promise<void> {
    // Block startup on the first load, same as legacy `await loadClientUrls()` before `server.listen()`.
    await this.refreshCache();
    this.refreshTimer = setInterval(() => {
      void this.refreshCache();
    }, REFRESH_INTERVAL_MS);
    this.refreshTimer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  async refreshCache(): Promise<void> {
    try {
      const clients = await this.clientDetailsRepo.find({
        select: { csmsUrl: true, cpoUrl: true, fleetUrl: true, userPortalUrl: true },
      });

      const dynamicOrigins = clients.flatMap((client) => [client.csmsUrl, client.cpoUrl, client.fleetUrl, client.userPortalUrl]);

      const normalized = [...dynamicOrigins, ...STATIC_CORS_ALLOWLIST]
        .filter((url): url is string => Boolean(url))
        .map((url) => this.stripTrailingSlash(url));

      this.cachedOrigins = new Set(normalized);
      this.logger.log(`CORS allowlist refreshed: ${this.cachedOrigins.size} origins cached`);
    } catch (error) {
      this.logger.error(`Failed to refresh CORS allowlist: ${(error as Error).message}`, (error as Error).stack);
    }
  }

  isOriginAllowed(origin: string): boolean {
    return this.cachedOrigins.has(this.stripTrailingSlash(origin));
  }

  /** Origin resolver in the shape expected by `@fastify/cors` / Nest's `enableCors`. */
  originResolver = (origin: string | undefined, callback: CorsOriginCallback): void => {
    // Same-origin / non-browser requests (curl, server-to-server, mobile apps) send no Origin header.
    if (!origin) return callback(null, true);

    if (this.isOriginAllowed(origin)) {
      return callback(null, true);
    }

    this.logger.warn(`Blocked by CORS: ${origin}`);
    return callback(null, false);
  };

  private stripTrailingSlash(url: string): string {
    return url.endsWith('/') ? url.slice(0, -1) : url;
  }
}
