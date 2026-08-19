import { Global, Module } from '@nestjs/common';
import { RealtimeService } from './realtime.service';
import { RealtimeListenerService } from './realtime-listener.service';

/**
 * Global realtime module. Hosts the socket.io server (RealtimeService) and the Redis bridge that feeds
 * it events from other processes (RealtimeListenerService). Imported once by the API app — the only
 * process that should attach socket.io.
 */
@Global()
@Module({
  providers: [RealtimeService, RealtimeListenerService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
