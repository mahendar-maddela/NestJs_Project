import { BadRequestException, CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Staff } from '../../../clients/src/entities/staff.entity';

/**
 * Mirrors `controllers/auth/authenticateToken.js:clientUserAuthenticate` — resolves the tenant
 * (`req.client`) from a real, DB-verified secret (`x-client-token` -> Staff.clientToken), not a
 * client-supplied clientId. Legacy mounts this globally ahead of every admin/vendor/fleet/web/app
 * router (`server.js:159-164`); super-admin, OCPI, and the two public webhook routes are excluded
 * there and mirrored the same way below.
 *
 * Implemented as a global guard (via APP_GUARD), not Express-style Nest middleware — under the
 * Fastify adapter, `NestMiddleware` is bridged through `@fastify/middie`, which only exposes
 * `request.raw` (the bare Node IncomingMessage) to the middleware function. Anything set there is
 * invisible to `@Req()` in controllers, since Nest's request pipeline hands controllers the real
 * FastifyRequest object, a different reference. Guards run inside that same real pipeline, so
 * `req.client` set here is visible everywhere downstream.
 */
@Injectable()
export class ClientTokenGuard implements CanActivate {
  constructor(
    @InjectRepository(Staff) private readonly staffRepo: Repository<Staff>,
  ) {}

  private isExcluded(url: string): boolean {
    return (
      url.startsWith('/v1/super-admin') ||
      url.startsWith('/v1/ocpi') ||
      /^\/v1\/[^/]+\/webhook(\?|$)/.test(url) ||
      /^\/v1\/qr\/[^/]+\/webhook\/razorpay(\?|$)/.test(url)
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req: any = context.switchToHttp().getRequest();
    const url: string = req.url || req.raw?.url || '';

    if (!url.startsWith('/v1/') || this.isExcluded(url)) {
      return true;
    }

    const token = req.headers['x-client-token'];
    if (!token) {
      throw new BadRequestException({ success: false, message: 'Client token is required' });
    }

    const client = await this.staffRepo.findOne({
      where: { clientToken: token },
      select: { id: true, clientId: true, clientToken: true },
    });

    if (!client) {
      throw new BadRequestException({ success: false, message: 'Invalid or inactive client token' });
    }

    req.client = client;
    return true;
  }
}
