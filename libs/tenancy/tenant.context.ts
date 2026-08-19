import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

export const TENANT_CLS_KEY = 'TENANT_ID';

@Injectable()
export class TenantContextService {
  constructor(private readonly cls: ClsService) {}

  setTenantId(tenantId: number): void {
    this.cls.set(TENANT_CLS_KEY, tenantId);
  }

  getTenantId(): number | undefined {
    return this.cls.get<number>(TENANT_CLS_KEY);
  }

  requireTenantId(): number {
    const tenantId = this.getTenantId();
    if (!tenantId) {
      throw new Error('Tenant context missing: Request must be scoped to a valid clientId');
    }
    return tenantId;
  }
}
