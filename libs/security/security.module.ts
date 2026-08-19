import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientDetails } from '../../modules/clients/src/entities/client-details.entity';
import { DynamicCorsService } from './services/dynamic-cors.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([ClientDetails])],
  providers: [DynamicCorsService],
  exports: [DynamicCorsService],
})
export class SecurityModule {}
