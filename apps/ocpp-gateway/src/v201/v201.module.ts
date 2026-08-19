import { Module } from '@nestjs/common';
import { DatabaseModule } from 'database/src';
import { Ocpp201Router } from './v201.router';
import { OcppLoggerService } from '../common/services/ocpp-logger.service';

@Module({
  imports: [DatabaseModule],
  providers: [Ocpp201Router, OcppLoggerService],
  exports: [Ocpp201Router],
})
export class Ocpp201Module {}
