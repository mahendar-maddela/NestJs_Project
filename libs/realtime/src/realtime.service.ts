import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

/**
 * Socket.io server wrapper. The API app (apps/api) is the only process that hosts a socket.io server —
 * exactly like legacy, where `src/utils/socketIo.js:initSocket(server)` attached io to the single HTTP
 * server clients connected to. Clients join rooms named by `sessionId` (transaction lifecycle events)
 * or `chargerId` (status events); `emitToRoom` fans out to all sockets in that room.
 *
 * Events from the OCPP gateway process arrive via Redis (RealtimeListenerService) and OCPI/command
 * flows inside the API process call `emitToRoom` directly.
 */
@Injectable()
export class RealtimeService implements OnModuleDestroy {
  private readonly logger = new Logger(RealtimeService.name);
  private io: Server | null = null;

  /** Mirrors legacy `initSocket(server)` — same CORS and the same join/message/disconnect handlers. */
  attach(httpServer: any): void {
    if (this.io) return;

    this.io = new Server(httpServer, {
      cors: {
        origin: '*',
        credentials: true,
        methods: ['GET', 'POST'],
      },
    });

    this.io.on('connection', (socket: Socket) => {
      this.logger.log(`Socket.io client connected: ${socket.id}`);

      socket.on('join', (room: string) => {
        this.logger.log(`Socket.io client joined: ${room}`);
        socket.join(room);
      });

      socket.on('message', (msg: string) => {
        socket.emit('response', `Echo: ${msg}`);
      });

      socket.on('disconnect', () => {
        this.logger.log(`Socket.io client disconnected: ${socket.id}`);
      });
    });
  }

  /** Fan out an event to every socket in `room`. No-op until the server has been attached. */
  emitToRoom(room: string, event: string, data: unknown): void {
    if (!this.io) return;
    this.io.to(room).emit(event, data);
  }

  onModuleDestroy(): void {
    if (this.io) {
      this.io.close();
      this.io = null;
    }
  }
}
