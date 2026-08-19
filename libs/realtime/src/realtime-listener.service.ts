import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { RedisService } from '@app/redis';
import { REALTIME_EVENT_CHANNEL, RealtimeEventPayload } from '@app/common';
import { RealtimeService } from './realtime.service';

/**
 * Bridges realtime events from other processes (apps/ocpp-gateway) into the socket.io server hosted by
 * this API process. The gateway publishes `{ room, event, data }` on `REALTIME_EVENT_CHANNEL`; this
 * service subscribes and fans out to the room. Mirrors the legacy single-process `io.to(room).emit(...)`
 * call sites across the OCPP handlers and the OCPI ImportEmsp flows.
 */
@Injectable()
export class RealtimeListenerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RealtimeListenerService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly realtimeService: RealtimeService,
  ) {}

  onModuleInit(): void {
    // Queued and auto-(re)subscribed by RedisService if Redis isn't ready yet — no raw
    // "Connection is closed" errors when Redis is down at startup.
    this.redisService.subscribe(REALTIME_EVENT_CHANNEL, (channel, message) => {
      this.handleEvent(message).catch((err) =>
        this.logger.error(`Realtime event handling failed: ${err.message}`),
      );
    });
  }

  private async handleEvent(raw: string): Promise<void> {
    let payload: RealtimeEventPayload;
    try {
      payload = JSON.parse(raw);
    } catch {
      this.logger.warn('Received malformed realtime event');
      return;
    }
    this.realtimeService.emitToRoom(payload.room, payload.event, payload.data);
  }

  onModuleDestroy(): void {
    this.redisService.unsubscribe(REALTIME_EVENT_CHANNEL);
  }
}
