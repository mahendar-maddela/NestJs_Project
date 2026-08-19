import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { WebSocket } from 'ws';
import { ConnectionRegistry } from './connection.registry';

interface PendingCall {
  resolve: (payload: any) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
}

/**
 * Tracks CALL messages we send *to* a charger (RemoteStartTransaction.req, RemoteStopTransaction.req, ...)
 * so the eventual CALLRESULT/CALLERROR frame from the charger can be matched back to its caller.
 * OCPP itself has no built-in request/response correlation beyond the messageId, so this is that layer.
 */
@Injectable()
export class PendingCallRegistry {
  private readonly logger = new Logger(PendingCallRegistry.name);
  private readonly pending = new Map<string, PendingCall>();

  constructor(private readonly connectionRegistry: ConnectionRegistry) {}

  /** Sends `[2, messageId, action, payload]` to the charger and resolves when its CALLRESULT/CALLERROR arrives. */
  async sendCall(chargerId: string, action: string, payload: Record<string, unknown>, timeoutMs = 30000): Promise<any> {
    const socket = this.connectionRegistry.get(chargerId);
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      throw new Error(`Charger ${chargerId} is not connected`);
    }

    const messageId = randomUUID();

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(messageId);
        reject(new Error(`Timed out waiting for ${action} response from charger ${chargerId}`));
      }, timeoutMs);

      this.pending.set(messageId, { resolve, reject, timer });

      try {
        socket.send(JSON.stringify([2, messageId, action, payload]));
      } catch (err) {
        clearTimeout(timer);
        this.pending.delete(messageId);
        reject(err as Error);
      }
    });
  }

  /** Call this from the router for every inbound frame before falling through to action dispatch. */
  handleIncoming(frame: any[]): boolean {
    const [messageTypeId, messageId, second, third] = frame;
    if (messageTypeId !== 3 && messageTypeId !== 4) return false;

    const pending = this.pending.get(messageId);
    if (!pending) return false;

    clearTimeout(pending.timer);
    this.pending.delete(messageId);

    if (messageTypeId === 3) {
      pending.resolve(second);
    } else {
      pending.reject(new Error(`CALLERROR: ${second} - ${third}`));
    }
    return true;
  }
}
