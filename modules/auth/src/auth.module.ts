import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AwsModule } from '@integrations/aws';
import { SmtpModule } from '@integrations/smtp';
import { Msg91Module } from '@integrations/msg91';
import { Staff } from '../../clients/src/entities/staff.entity';
import { StaffRole } from '../../clients/src/entities/staff-role.entity';
import { RolePermission } from '../../clients/src/entities/role-permission.entity';
import { ClientDetails } from '../../clients/src/entities/client-details.entity';
import { ClientFeature } from '../../clients/src/entities/client-feature.entity';
import { ClientFeatureMapping } from '../../clients/src/entities/client-feature-mapping.entity';
import { LoginTrack } from '../../clients/src/entities/login-track.entity';
import { PrefixConfig } from '../../clients/src/entities/prefix-config.entity';
import { CredentialConfig } from '../../clients/src/entities/credential-config.entity';
import { SuperAdmin } from '../../super-admin/src/entities/super-admin.entity';
import { User } from '../../users/src/entities/user.entity';
import { Vendor } from '../../vendors/src/entities/vendor.entity';
import { Feature } from '../../vendors/src/entities/feature.entity';
import { FeaturePermission } from '../../vendors/src/entities/feature-permission.entity';
import { FleetUser } from '../../fleet/src/entities/fleet-user.entity';
import { FleetUserDetail } from '../../fleet/src/entities/fleet-user-detail.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { Otp } from './entities/otp.entity';
import { ForgotPassword } from './entities/forgot-password.entity';
import { UnverifiedUser } from './entities/unverified-user.entity';
import { Wallet } from '../../wallet/src/entities/wallet.entity';
import { OcpiCpo } from '../../ocpi/src/entities/ocpi-cpo.entity';
import { OcpiEmsp } from '../../ocpi/src/entities/ocpi-emsp.entity';

// Services
import { SuperAdminAuthService } from './services/super-admin-auth.service';
import { AdminAuthService } from './services/admin-auth.service';
import { VendorAuthService } from './services/vendor-auth.service';
import { FleetAuthService } from './services/fleet-auth.service';
import { UserAuthService } from './services/user-auth.service';
import { OtpChannelService } from './services/otp-channel.service';

// Controllers
import { SuperAdminAuthController } from './controllers/super-admin-auth.controller';
import { AdminAuthController } from './controllers/admin-auth.controller';
import { VendorAuthController } from './controllers/vendor-auth.controller';
import { FleetAuthController } from './controllers/fleet-auth.controller';
import { UserAuthController } from './controllers/user-auth.controller';
import { WebAuthController } from './controllers/web-auth.controller';
import { DriverAuthService } from './services/driver-auth.service';
import { DriverAuthController } from './controllers/driver-auth.controller';

// Strategies & Guards
import {
  SuperAdminJwtStrategy,
  AdminJwtStrategy,
  VendorJwtStrategy,
  UserJwtStrategy,
  FleetJwtStrategy,
} from './strategies/jwt.strategies';
import { OcpiCpoAuthGuard, OcpiEmspAuthGuard } from './guards/ocpi-auth.guard';
import { StaffPermissionsGuard } from './guards/staff-permissions.guard';
import { ClientFeaturesGuard } from './guards/client-features.guard';
import { VendorFeaturesGuard } from './guards/vendor-features.guard';

import { AuthRepository } from './repositories/auth.repository';
import { ClientTokenGuard } from './guards/client-token.guard';

@Global()
@Module({
  imports: [
    AwsModule,
    SmtpModule,
    Msg91Module,
    TypeOrmModule.forFeature([
      Staff,
      StaffRole,
      RolePermission,
      ClientDetails,
      ClientFeature,
      ClientFeatureMapping,
      SuperAdmin,
      User,
      Vendor,
      Feature,
      FeaturePermission,
      FleetUser,
      FleetUserDetail,
      RefreshToken,
      Otp,
      ForgotPassword,
      LoginTrack,
      Wallet,
      UnverifiedUser,
      PrefixConfig,
      CredentialConfig,
      OcpiCpo,
      OcpiEmsp,
    ]),
    PassportModule.register({ defaultStrategy: 'admin-jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET_KEY', 'nexin-super-secret-key'),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    AuthRepository,
    SuperAdminAuthService,
    AdminAuthService,
    VendorAuthService,
    FleetAuthService,
    UserAuthService,
    OtpChannelService,
    DriverAuthService,
    SuperAdminJwtStrategy,
    AdminJwtStrategy,
    VendorJwtStrategy,
    UserJwtStrategy,
    FleetJwtStrategy,
    OcpiCpoAuthGuard,
    OcpiEmspAuthGuard,
    StaffPermissionsGuard,
    ClientFeaturesGuard,
    VendorFeaturesGuard,
    ClientTokenGuard,
  ],
  controllers: [
    SuperAdminAuthController,
    AdminAuthController,
    VendorAuthController,
    FleetAuthController,
    UserAuthController,
    WebAuthController,
    DriverAuthController,
  ],
  exports: [
    AuthRepository,
    SuperAdminAuthService,
    AdminAuthService,
    VendorAuthService,
    FleetAuthService,
    UserAuthService,
    OtpChannelService,
    DriverAuthService,
    JwtModule,
    OcpiCpoAuthGuard,
    OcpiEmspAuthGuard,
    StaffPermissionsGuard,
    ClientFeaturesGuard,
    VendorFeaturesGuard,
    ClientTokenGuard,
  ],
})
export class AuthModule {}
