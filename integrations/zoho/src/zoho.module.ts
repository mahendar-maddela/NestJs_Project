import { Global, Module } from '@nestjs/common';
import { ZohoService } from './zoho.service';

@Global()
@Module({
  providers: [ZohoService],
  exports: [ZohoService],
})
export class ZohoModule {}
