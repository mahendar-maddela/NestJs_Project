import { CanActivate, ExecutionContext, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { FeaturePermission } from '../../../vendors/src/entities/feature-permission.entity';
import { Feature } from '../../../vendors/src/entities/feature.entity';
import { VENDOR_FEATURE_KEY } from '../decorators/vendor-feature.decorator';

/** Mirrors `controllers/auth/authorize.js:authorizeFeature`. Vendor-level feature flag (Vendor <-> Feature via FeaturePermission). */
@Injectable()
export class VendorFeaturesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(FeaturePermission) private readonly permissionRepo: Repository<FeaturePermission>,
    @InjectRepository(Feature) private readonly featureRepo: Repository<Feature>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.getAllAndOverride<string>(VENDOR_FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredFeature) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const vendorId = Number(req.vendor?.vendorId || req.user?.id);

    if (!vendorId) {
      throw new NotFoundException({ success: false, message: 'vendor not found' });
    }

    const permissions = await this.permissionRepo.find({ where: { vendorId } });
    const featureRows = permissions.length
      ? await this.featureRepo.findBy({ id: In(permissions.map((p) => p.featureId)) })
      : [];
    req.features = featureRows.map((f) => f.name);

    if (!req.features.includes(requiredFeature)) {
      throw new ForbiddenException({ success: false, message: 'Forbidden: You do not have access to this feature' });
    }

    return true;
  }
}
