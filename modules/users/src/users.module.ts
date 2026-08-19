import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FirebaseModule } from '@integrations/firebase';
import { User } from './entities/user.entity';
import { Vehicle } from './entities/vehicle.entity';
import { Brand } from './entities/brand.entity';
import { VehicleModel } from './entities/vehicle-model.entity';
import { VehicleCapacity } from './entities/vehicle-capacity.entity';
import { DeviceTransaction } from '../../sessions/src/entities/device-transaction.entity';
import { Wallet } from '../../wallet/src/entities/wallet.entity';
import { WalletTransaction } from '../../wallet/src/entities/wallet-transaction.entity';
import { RfidTag } from '../../fleet/src/entities/rfid-tag.entity';
import { VendorUser } from '../../vendors/src/entities/vendor-user.entity';
import { PaymentTransaction } from '../../payments/src/entities/payment-transaction.entity';
import { PrefixConfig } from '../../clients/src/entities/prefix-config.entity';
import { CredentialConfig } from '../../clients/src/entities/credential-config.entity';
import { ClientDetails } from '../../clients/src/entities/client-details.entity';
import { StationFavourite } from '../../stations/src/entities/station-favourite.entity';
import { Otp } from '../../auth/src/entities/otp.entity';
import { UserRepository } from './repositories/user.repository';
import { AdminUserRepository } from './repositories/admin-user.repository';
import { UserProfileRepository } from './repositories/user-profile.repository';
import { VehicleRepository } from './repositories/vehicle.repository';
import { AdminBrandRepository } from './repositories/admin-brand.repository';
import { AdminVehicleModelRepository } from './repositories/admin-vehicle-model.repository';
import { AdminCouponRepository } from './repositories/admin-coupon.repository';
import { UserService } from './services/user.service';
import { AdminUserService } from './services/admin-user.service';
import { UserProfileService } from './services/user-profile.service';
import { VehicleService } from './services/vehicle.service';
import { AdminBrandService } from './services/admin-brand.service';
import { AdminVehicleModelService } from './services/admin-vehicle-model.service';
import { AdminCouponService } from './services/admin-coupon.service';
import { AdminUsersController } from './controllers/admin-users.controller';
import { UserProfileController } from './controllers/user-profile.controller';
import { UserVehicleController } from './controllers/user-vehicle.controller';
import { AdminBrandController } from './controllers/admin-brand.controller';
import { AdminVehicleModelController } from './controllers/admin-vehicle-model.controller';
import { AdminCouponController } from './controllers/admin-coupon.controller';

import { Coupon } from './entities/coupon.entity';
import { CouponUser } from './entities/coupon-user.entity';
import { SuperAdminUserRepository } from './repositories/super-admin-user.repository';
import { AppCouponService } from './services/app-coupon.service';
import { AppCouponController } from './controllers/app-coupon.controller';
import { PaymentsModule } from '../../payments/src/payments.module';

@Module({
  imports: [
    FirebaseModule,
    PaymentsModule,
    TypeOrmModule.forFeature([
      User,
      Vehicle,
      DeviceTransaction,
      Wallet,
      WalletTransaction,
      RfidTag,
      VendorUser,
      PaymentTransaction,
      PrefixConfig,
      StationFavourite,
      CredentialConfig,
      ClientDetails,
      Otp,
      Brand,
      VehicleModel,
      VehicleCapacity,
      Coupon,
      CouponUser,
    ]),
  ],
  controllers: [
    AdminUsersController,
    UserProfileController,
    UserVehicleController,
    AdminBrandController,
    AdminVehicleModelController,
    AdminCouponController,
    AppCouponController,
  ],
  providers: [
    UserRepository,
    AdminUserRepository,
    UserProfileRepository,
    VehicleRepository,
    AdminBrandRepository,
    AdminVehicleModelRepository,
    AdminCouponRepository,
    SuperAdminUserRepository,
    UserService,
    AdminUserService,
    UserProfileService,
    VehicleService,
    AdminBrandService,
    AdminVehicleModelService,
    AdminCouponService,
    AppCouponService,
  ],
  exports: [
    UserRepository,
    AdminUserRepository,
    UserProfileRepository,
    VehicleRepository,
    AdminBrandRepository,
    AdminVehicleModelRepository,
    AdminCouponRepository,
    SuperAdminUserRepository,
    UserService,
    AdminUserService,
    UserProfileService,
    VehicleService,
    AdminBrandService,
    AdminVehicleModelService,
    AdminCouponService,
  ],
})
export class UsersModule { }
