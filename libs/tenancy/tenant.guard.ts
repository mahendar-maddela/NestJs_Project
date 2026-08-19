import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { TenantContextService } from './tenant.context';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly tenantContext: TenantContextService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    let clientId: number | undefined = request.user?.clientId;

    if (!clientId && request.headers['x-client-id']) {
      const headerVal = Number(request.headers['x-client-id']);
      if (!isNaN(headerVal)) {
        clientId = headerVal;
      }
    }

    if (clientId) {
      this.tenantContext.setTenantId(clientId);
    }

    return true;
  }
}
