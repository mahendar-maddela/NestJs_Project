import { DatabaseModule } from 'database/src';
import { RedisModule } from '@app/redis';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    RedisModule,
  ],
})
export class OcppGatewayAppModule {}
