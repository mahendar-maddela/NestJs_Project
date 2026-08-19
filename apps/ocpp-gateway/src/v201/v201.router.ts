import { Injectable, Logger } from '@nestjs/common';
import { WebSocket } from 'ws';
import { OcppLoggerService } from '../common/services/ocpp-logger.service';

/**
 * Minimal OCPP 2.0.1/2.1 handling. Legacy is an OCPP 1.6-only platform, so a 2.x charger cannot be
 * serviced end-to-end; instead of silently swallowing its frames (which makes the charger hang waiting
 * for a response), every incoming CALL is answered with a protocol-valid CallError so the charger can
 * fail fast and surface the problem.
 */
@Injectable()
export class Ocpp201Router {
  private readonly logger = new Logger(Ocpp201Router.name);

  constructor(private readonly ocppLoggerService: OcppLoggerService) {}

  async handleMessage(ws: WebSocket, incoming: any[], chargerIdStr: string): Promise<void> {
    const messageType = incoming?.[0];
    const messageId = incoming?.[1];
    const action = incoming?.[2];

    this.logger.log(`OCPP 2.0.1/2.1 message received from ${chargerIdStr} (type=${messageType}, action=${String(action ?? 'n/a')})`);

    if (messageType !== 2) {
      // CALLRESULT / CALLERROR — we never send 2.x CALLs, so nothing to correlate. Log and drop.
      return;
    }

    // OCPP 2.0.1 CallError: [4, messageId, errorCode, errorDescription, errorDetails]
    const callError = [
      4,
      messageId,
      'NotSupported',
      'This platform supports OCPP 1.6 only. Upgrade the charger firmware to OCPP 1.6 or use the 1.6 endpoint.',
      {},
    ];

    try {
      ws.send(JSON.stringify(callError));
      await this.ocppLoggerService.logData(callError, chargerIdStr, 2, String(action ?? 'CallError'));
    } catch (err: any) {
      this.logger.error(`Failed to send OCPP 2.0.1 CallError to ${chargerIdStr}: ${err.message}`);
    }
  }
}
