import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class SuperAdminAuthGuard extends AuthGuard('super-admin-jwt') {}

@Injectable()
export class AdminAuthGuard extends AuthGuard('admin-jwt') {}

@Injectable()
export class VendorAuthGuard extends AuthGuard('vendor-jwt') {}

@Injectable()
export class UserAuthGuard extends AuthGuard('user-jwt') {}

@Injectable()
export class FleetAuthGuard extends AuthGuard('fleet-jwt') {}
