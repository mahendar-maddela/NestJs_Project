import { Module } from '@nestjs/common';
import { DatabaseModule } from 'database/src';
import { Ocpp16Router } from './v16.router';
import { BootNotificationHandlerV16 } from './handlers/boot-notification.handler';
import { AuthorizeHandlerV16 } from './handlers/authorize.handler';
import { StartTransactionHandlerV16 } from './handlers/start-transaction.handler';
import { StopTransactionHandlerV16 } from './handlers/stop-transaction.handler';
import { MeterValuesHandlerV16 } from './handlers/meter-values.handler';
import { StatusNotificationHandlerV16 } from './handlers/status-notification.handler';
import { DataTransferHandlerV16 } from './handlers/data-transfer.handler';
import { FirmwareDiagnosticsHandlerV16 } from './handlers/firmware-diagnostics.handler';
import { ConfigurationHandlerV16 } from './handlers/configuration.handler';

@Module({
  imports: [DatabaseModule],
  providers: [
    Ocpp16Router,
    BootNotificationHandlerV16,
    AuthorizeHandlerV16,
    StartTransactionHandlerV16,
    StopTransactionHandlerV16,
    MeterValuesHandlerV16,
    StatusNotificationHandlerV16,
    DataTransferHandlerV16,
    FirmwareDiagnosticsHandlerV16,
    ConfigurationHandlerV16,
  ],
  exports: [Ocpp16Router, StopTransactionHandlerV16],
})
export class Ocpp16Module {}
