import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from 'database/src';
import { RedisModule } from '@app/redis';
import { TenancyModule } from '@app/tenancy';
import { FirebaseModule } from '@integrations/firebase';
import { OcppGateway } from './gateway';
import { OcppCommonModule } from './common/ocpp-common.module';
import { OcppCommandBridgeService } from './common/services/ocpp-command-bridge.service';
import { InternalOcppCommandController } from './common/controllers/internal-ocpp-command.controller';
import { Ocpp16Module } from './v16/v16.module';
import { Ocpp201Module } from './v201/v201.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    RedisModule,
    TenancyModule,
    FirebaseModule,
    OcppCommonModule,
    Ocpp16Module,
    Ocpp201Module,
  ],
  controllers: [InternalOcppCommandController],
  providers: [OcppGateway, OcppCommandBridgeService],
  exports: [OcppGateway],
})
export class GatewayModule {}
