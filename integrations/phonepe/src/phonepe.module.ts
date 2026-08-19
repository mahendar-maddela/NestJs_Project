import { Global, Module } from '@nestjs/common';
import { PhonePeService } from './phonepe.service';

@Global()
@Module({
  providers: [PhonePeService],
  exports: [PhonePeService],
})
export class PhonePeModule {}
