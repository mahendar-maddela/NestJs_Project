import { Global, Module } from '@nestjs/common';
import { ConnectionRegistry } from './registry/connection.registry';
import { PendingCallRegistry } from './registry/pending-call.registry';
import { OcppLoggerService } from './services/ocpp-logger.service';
import { OcpiIntegrationService } from './services/ocpi-integration.service';
import { RealtimeBridgeService } from './services/realtime-bridge.service';

/**
 * Shared singletons between GatewayModule (owns the WS server) and Ocpp16Module/Ocpp201Module
 * (own inbound message dispatch). PendingCallRegistry in particular must be the SAME instance
 * in both places — it correlates an outbound CALL sent from the command bridge with the
 * CALLRESULT the router sees come back over the same WebSocket.
 */
@Global()
@Module({
  providers: [ConnectionRegistry, PendingCallRegistry, OcppLoggerService, OcpiIntegrationService, RealtimeBridgeService],
  exports: [ConnectionRegistry, PendingCallRegistry, OcppLoggerService, OcpiIntegrationService, RealtimeBridgeService],
})
export class OcppCommonModule {}
