import { Body, Controller, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandRequest, OcppCommandBridgeService } from '../services/ocpp-command-bridge.service';

/**
 * Direct-HTTP fallback for the Redis-based OCPP command bridge. `apps/api`'s `ChargerCommandService`
 * uses this only when it can't publish to Redis at all (Redis down/unconfigured) — the two apps are
 * separate processes with no other way to reach each other, and per CLAUDE.md, "Redis unavailable
 * must not stop charging" — RemoteStart/RemoteStop/Reset must keep working. Not part of the normal
 * happy path: Redis pub/sub stays the default because it doesn't require either app to know the
 * other's network address, but this exists so a Redis outage can't take down charging control.
 *
 * Guarded by a shared secret rather than JWT — this is service-to-service, not user-facing, and
 * mirrors none of the actor auth strategies (CLAUDE.md: "Never reuse JWT guards for OCPI" — same
 * principle applies here, this is its own boundary).
 */
@Controller('internal/ocpp-command')
export class InternalOcppCommandController {
  constructor(
    private readonly bridge: OcppCommandBridgeService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  async handle(@Body() body: CommandRequest, @Headers('x-internal-secret') secret: string | undefined) {
    const expected = this.configService.get<string>('INTERNAL_COMMAND_SECRET');
    if (!expected || secret !== expected) {
      throw new UnauthorizedException('Invalid internal command secret');
    }

    return this.bridge.processCommand(body);
  }
}
