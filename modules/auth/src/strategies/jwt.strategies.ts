import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SuperAdmin } from '../../../super-admin/src/entities/super-admin.entity';
import { Staff } from '../../../clients/src/entities/staff.entity';
import { Vendor } from '../../../vendors/src/entities/vendor.entity';
import { User } from '../../../users/src/entities/user.entity';
import { FleetUser } from '../../../fleet/src/entities/fleet-user.entity';

export interface JwtPayload {
  sub: number;
  email?: string;
  phone?: string;
  actorType: 'superAdmin' | 'staff' | 'vendor' | 'user' | 'fleetuser';
  clientId?: number;
}

/**
 * Mirrors `controllers/auth/authenticateToken.js`'s tenant binding: legacy verifies the actor is
 * looked up with `where: { id: userId, clientId: req.client.clientId }` — i.e. a JWT issued for
 * client A is rejected the moment the request carries client B's `x-client-token`. All tenant-scoped
 * strategies below enforce the same rule using the DB-verified tenant set by `ClientTokenGuard`
 * (which runs before controller guards), falling back to the token's own `clientId` only when no
 * tenant context exists (non-`/v1` internal routes that never pass through the guard).
 */

@Injectable()
export class SuperAdminJwtStrategy extends PassportStrategy(Strategy, 'super-admin-jwt') {
  constructor(
    configService: ConfigService,
    @InjectRepository(SuperAdmin) private readonly superAdminRepo: Repository<SuperAdmin>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET_KEY', 'nexin-super-secret-key'),
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.actorType !== 'superAdmin') {
      throw new UnauthorizedException('Invalid actor token for SuperAdmin access');
    }
    const admin = await this.superAdminRepo.findOne({ where: { id: payload.sub } });
    if (!admin || !admin.isActive) {
      throw new UnauthorizedException('SuperAdmin account inactive or non-existent');
    }
    return { ...admin, actorType: 'superAdmin' };
  }
}

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    configService: ConfigService,
    @InjectRepository(Staff) private readonly staffRepo: Repository<Staff>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET_KEY', 'nexin-super-secret-key'),
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: JwtPayload) {
    if (payload.actorType !== 'staff') {
      throw new UnauthorizedException('Invalid actor token for Client Admin access');
    }
    const clientId = req?.client?.clientId ?? payload.clientId;
    const staff = await this.staffRepo.findOne({
      where: { id: payload.sub, ...(clientId ? { clientId } : {}) },
    });
    if (!staff || staff.status !== 'Active') {
      throw new UnauthorizedException('Staff account inactive or non-existent');
    }
    return { ...staff, actorType: 'staff', clientId: staff.clientId };
  }
}

@Injectable()
export class VendorJwtStrategy extends PassportStrategy(Strategy, 'vendor-jwt') {
  constructor(
    configService: ConfigService,
    @InjectRepository(Vendor) private readonly vendorRepo: Repository<Vendor>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET_KEY', 'nexin-super-secret-key'),
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: JwtPayload) {
    if (payload.actorType !== 'vendor') {
      throw new UnauthorizedException('Invalid actor token for Vendor access');
    }
    const clientId = req?.client?.clientId ?? payload.clientId;
    const vendor = await this.vendorRepo.findOne({
      where: { id: payload.sub, ...(clientId ? { clientId } : {}) },
    });
    if (!vendor || vendor.status !== 'Active') {
      throw new UnauthorizedException('Vendor account inactive or non-existent');
    }
    return { ...vendor, actorType: 'vendor', clientId: vendor.clientId };
  }
}

@Injectable()
export class UserJwtStrategy extends PassportStrategy(Strategy, 'user-jwt') {
  constructor(
    configService: ConfigService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET_KEY', 'nexin-super-secret-key'),
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: JwtPayload) {
    if (payload.actorType !== 'user') {
      throw new UnauthorizedException('Invalid actor token for Driver Mobile App access');
    }
    const clientId = req?.client?.clientId ?? payload.clientId;
    const user = await this.userRepo.findOne({
      where: { id: payload.sub, ...(clientId ? { clientId } : {}) },
    });
    if (!user || user.status !== 'Active') {
      throw new UnauthorizedException('User account blocked or inactive');
    }
    return { ...user, actorType: 'user', clientId: user.clientId };
  }
}

@Injectable()
export class FleetJwtStrategy extends PassportStrategy(Strategy, 'fleet-jwt') {
  constructor(
    configService: ConfigService,
    @InjectRepository(FleetUser) private readonly fleetUserRepo: Repository<FleetUser>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET_KEY', 'nexin-super-secret-key'),
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: JwtPayload) {
    if (payload.actorType !== 'fleetuser') {
      throw new UnauthorizedException('Invalid actor token for Fleet access');
    }
    const clientId = req?.client?.clientId ?? payload.clientId;
    const fleetUser = await this.fleetUserRepo.findOne({
      where: { id: payload.sub, ...(clientId ? { clientId } : {}) },
    });
    if (!fleetUser || fleetUser.status !== 'Active') {
      throw new UnauthorizedException('Fleet user account inactive or blocked');
    }
    return { ...fleetUser, actorType: 'fleetuser', clientId: fleetUser.clientId };
  }
}
