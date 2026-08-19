import { CanActivate, ExecutionContext, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ClientFeatureMapping } from '../../../clients/src/entities/client-feature-mapping.entity';
import { ClientFeature } from '../../../clients/src/entities/client-feature.entity';
import { CLIENT_FEATURE_KEY } from '../decorators/client-feature.decorator';

/** Mirrors `controllers/auth/authorize.js:authorizeClientFeatures`. Tenant-level feature flag, separate from staff permissions. */
@Injectable()
export class ClientFeaturesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(ClientFeatureMapping) private readonly mappingRepo: Repository<ClientFeatureMapping>,
    @InjectRepository(ClientFeature) private readonly featureRepo: Repository<ClientFeature>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.getAllAndOverride<string>(CLIENT_FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredFeature) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const clientId = Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id']);

    if (!clientId) {
      throw new NotFoundException({ success: false, message: 'Client not found' });
    }

    const mappings = await this.mappingRepo.find({ where: { clientId } });
    if (!mappings.length) {
      req.features = [];
    } else {
      const featureRows = await this.featureRepo.findBy({ id: In(mappings.map((m) => m.featureId)) });
      req.features = featureRows.map((f) => f.name);
    }

    if (!req.features.includes(requiredFeature)) {
      throw new ForbiddenException({ success: false, message: 'Forbidden: You do not have access to this feature' });
    }

    return true;
  }
}
