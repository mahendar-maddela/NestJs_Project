import { Global, Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { TenantContextService } from './tenant.context';
import { TenantGuard } from './tenant.guard';

@Global()
@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
  ],
  providers: [TenantContextService, TenantGuard],
  exports: [TenantContextService, TenantGuard],
})
export class TenancyModule {}
