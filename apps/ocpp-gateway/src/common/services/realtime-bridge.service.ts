import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@app/redis';
import { REALTIME_EVENT_CHANNEL, RealtimeEventPayload } from '@app/common';

/**
 * Publishes realtime events to the API app over Redis. The socket.io server lives in apps/api (the
 * process clients connect to), so every legacy `io.to(room).emit(event, data)` call site inside the
 * OCPP handlers — which run in this gateway process — becomes a publish on `REALTIME_EVENT_CHANNEL`;
 * RealtimeListenerService in apps/api re-emits it to the room.
 */
@Injectable()
export class RealtimeBridgeService {
  private readonly logger = new Logger(RealtimeBridgeService.name);

  constructor(private readonly redisService: RedisService) {}

  async emitToRoom(room: string, event: string, data?: unknown): Promise<void> {
    try {
      const payload: RealtimeEventPayload = { room, event, data };
      await this.redisService.publish(REALTIME_EVENT_CHANNEL, JSON.stringify(payload));
      // this.logger.log(`Realtime event ${event} published to room ${room}`, payload);
    } catch (err: any) {
      this.logger.error(`Failed to publish realtime event ${event} to room ${room}: ${err.message}`);
    }
  }
}
