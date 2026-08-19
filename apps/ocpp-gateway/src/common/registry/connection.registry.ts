import { Injectable } from '@nestjs/common';
import { WebSocket } from 'ws';

@Injectable()
export class ConnectionRegistry {
  private activeConnections = new Map<string, WebSocket>();

  register(chargerId: string, socket: WebSocket) {
    this.activeConnections.set(chargerId, socket);
  }

  unregister(chargerId: string) {
    this.activeConnections.delete(chargerId);
  }

  get(chargerId: string): WebSocket | undefined {
    return this.activeConnections.get(chargerId);
  }

  has(chargerId: string): boolean {
    return this.activeConnections.has(chargerId);
  }

  getAll(): Map<string, WebSocket> {
    return this.activeConnections;
  }
}
