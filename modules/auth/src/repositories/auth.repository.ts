import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial, IsNull, In } from 'typeorm';
import { ActorType } from 'database/src';
import { Staff } from '../../../clients/src/entities/staff.entity';
import { StaffRole } from '../../../clients/src/entities/staff-role.entity';
import { RolePermission } from '../../../clients/src/entities/role-permission.entity';
import { LoginTrack } from '../../../clients/src/entities/login-track.entity';
import { PrefixConfig } from '../../../clients/src/entities/prefix-config.entity';
import { CredentialConfig } from '../../../clients/src/entities/credential-config.entity';
import { ClientDetails } from '../../../clients/src/entities/client-details.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { Otp } from '../entities/otp.entity';
import { ForgotPassword } from '../entities/forgot-password.entity';
import { UnverifiedUser } from '../entities/unverified-user.entity';
import { SuperAdmin } from '../../../super-admin/src/entities/super-admin.entity';
import { User } from '../../../users/src/entities/user.entity';
import { Wallet } from '../../../wallet/src/entities/wallet.entity';
import { FleetUser } from '../../../fleet/src/entities/fleet-user.entity';
import { FleetUserDetail } from '../../../fleet/src/entities/fleet-user-detail.entity';
import { Vendor } from '../../../vendors/src/entities/vendor.entity';


@Injectable()
export class AuthRepository {
  constructor(
    @InjectRepository(Staff) private readonly staffRepo: Repository<Staff>,
    @InjectRepository(StaffRole) private readonly staffRoleRepo: Repository<StaffRole>,
    @InjectRepository(RolePermission) private readonly rolePermissionRepo: Repository<RolePermission>,
    @InjectRepository(LoginTrack) private readonly loginTrackRepo: Repository<LoginTrack>,
    @InjectRepository(RefreshToken) private readonly refreshTokenRepo: Repository<RefreshToken>,
    @InjectRepository(Otp) private readonly otpRepo: Repository<Otp>,
    @InjectRepository(ForgotPassword) private readonly forgotPasswordRepo: Repository<ForgotPassword>,
    @InjectRepository(SuperAdmin) private readonly superAdminRepo: Repository<SuperAdmin>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Wallet) private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(UnverifiedUser) private readonly unverifiedUserRepo: Repository<UnverifiedUser>,
    @InjectRepository(PrefixConfig) private readonly prefixConfigRepo: Repository<PrefixConfig>,
    @InjectRepository(CredentialConfig) private readonly credentialConfigRepo: Repository<CredentialConfig>,
    @InjectRepository(ClientDetails) private readonly clientDetailsRepo: Repository<ClientDetails>,
    @InjectRepository(FleetUser) private readonly fleetUserRepo: Repository<FleetUser>,
    @InjectRepository(FleetUserDetail) private readonly fleetUserDetailRepo: Repository<FleetUserDetail>,
    @InjectRepository(Vendor) private readonly vendorRepo: Repository<Vendor>,
  ) { }

  // ---- Driver (fleet self-service driver app) auth ----

  findFleetDetailByFleetUId(fleetUId: string, clientId: number) {
    return this.fleetUserDetailRepo.findOne({ where: { fleetUId, clientId }, select: { id: true } });
  }

  findDriverByFleetPhoneClient(fleetId: number, phone: string, clientId: number) {
    return this.fleetUserRepo.findOne({
      where: { fleetId, phone, type: 'DRIVER', clientId },
      select: { id: true, email: true, phone: true, status: true, type: true },
    });
  }

  findDriverByIdClient(id: number, clientId: number) {
    return this.fleetUserRepo.findOne({ where: { id, clientId } });
  }

  findDriverByIdClientSelect(id: number, clientId: number) {
    return this.fleetUserRepo.findOne({
      where: { id, clientId },
      select: { id: true, email: true, phone: true, status: true, type: true },
    });
  }

  async updateDriver(id: number, data: Partial<FleetUser>) {
    await this.fleetUserRepo.update(id, data as any);
  }

  findOtpRecordByTypeId(type_id: number, type: ActorType) {
    return this.otpRepo.findOne({ where: { type_id, type } });
  }

  async updateOtpRecord(id: number, data: { type_id: number; otp: string; expires_at: Date; type: ActorType }) {
    await this.otpRepo.update(id, data as any);
  }

  async findStaffByField(field: string, clientId?: number) {
    return this.staffRepo.findOne({
      where: [
        { email: field, ...(clientId ? { clientId } : {}) },
        { phone: field, ...(clientId ? { clientId } : {}) },
      ],
      relations: { clientDetails: true },
    });
  }

  async findStaffById(id: number) {
    return this.staffRepo.findOne({
      where: { id },
      relations: { clientDetails: true },
    });
  }

  /** Mirrors `staffAuthController.js:getStaffByToken`. Staff <-> Role is many-to-many via Staff_Roles. */
  async findStaffFullProfile(id: number) {
    const staff = await this.staffRepo.findOne({
      where: { id },
      select: { id: true, email: true, phone: true, status: true, first_name: true, last_name: true, clientId: true, empId: true },
      relations: {
        features: true,
        permissions: true,
        roles: { permissions: true },
      }
    });

    if (!staff) return null;

    let features = staff.features || [];

    if (staff.id !== staff.clientId) {
      const client = await this.staffRepo.findOne({
        where: {
          id: staff.clientId,
        },
        select: { id: true },
        relations: {
          features: true,
        },
      });

      if (client?.features) {
        features = client.features;
      }
    }


    return staff;
  }

  async updateStaffPassword(id: number, hashedPassword: string) {
    return this.staffRepo.update({ id }, { password: hashedPassword });
  }

  async createLoginTrack(data: {
    clientId: number;
    staffId: number;
    ipAddress?: string;
    loginTime: Date;
    status: string;
    device?: string;
    browser?: string;
  }) {
    return this.loginTrackRepo.save(this.loginTrackRepo.create(data));
  }

  async updateLastLoginLogout(staffId: number) {
    const lastLogin = await this.loginTrackRepo.findOne({
      where: { staffId },
      order: { loginTime: 'DESC' },
    });

    if (lastLogin) {
      await this.loginTrackRepo.update({ id: lastLogin.id }, { logoutTime: new Date(), status: 'Logged Out' });
    }
  }

  async createRefreshToken(data: { userId: number; token: string; type: ActorType; expire: Date }) {
    return this.refreshTokenRepo.save(this.refreshTokenRepo.create(data));
  }

  async findRefreshToken(token: string, type: ActorType) {
    return this.refreshTokenRepo.findOne({ where: { token, type } });
  }

  async deleteRefreshToken(id: number) {
    return this.refreshTokenRepo.delete({ id });
  }

  async deleteRefreshTokensByUser(userId: number, type: ActorType) {
    return this.refreshTokenRepo.delete({ userId, type });
  }

  async findOtpRecord(otp: string, type: ActorType) {
    return this.otpRepo.findOne({ where: { otp, type } });
  }

  async deleteOtpRecord(id: number) {
    return this.otpRepo.delete({ id });
  }

  async createForgotPasswordToken(data: { token: string; userId: number; type: ActorType; expires_at: Date }) {
    return this.forgotPasswordRepo.save(this.forgotPasswordRepo.create(data));
  }

  async findForgotPasswordToken(token: string, type: ActorType) {
    return this.forgotPasswordRepo.findOne({ where: { token, type } });
  }

  async deleteForgotPasswordToken(id: number) {
    return this.forgotPasswordRepo.delete({ id });
  }

  async findSuperAdminByEmail(email: string) {
    return this.superAdminRepo.findOne({ where: { email } });
  }

  async findSuperAdminById(id: number) {
    return this.superAdminRepo.findOne({ where: { id } });
  }

  async updateSuperAdminPassword(id: number, hashedPassword: string) {
    return this.superAdminRepo.update({ id }, { password: hashedPassword });
  }

  async createOtpRecord(data: { type_id: number; otp: string; expires_at: Date; type: ActorType; contact?: string }) {
    return this.otpRepo.save(this.otpRepo.create(data));
  }

  async deleteOtpRecords(type_id: number, type: ActorType) {
    return this.otpRepo.delete({ type_id, type });
  }

  // ---- User (driver app / web) ----

  async findUserByContact(contact: string, clientId?: number) {
    return this.userRepo.findOne({
      where: [
        { email: contact, ...(clientId && { clientId }) },
        { phone: contact, ...(clientId && { clientId }) },
      ],
    });
  }

  async findUserByChannel(contactType: 'email' | 'phone', contact: string, clientId: number) {
    return this.userRepo.findOne({ where: { clientId, [contactType]: contact } });
  }

  async findUserById(id: number, includeWallet = false) {
    return this.userRepo.findOne({
      where: { id },
      relations: includeWallet ? { wallet: true } : undefined,
    });
  }

  async createUser(data: DeepPartial<User>) {
    return this.userRepo.save(this.userRepo.create(data));
  }

  async updateUser(id: number, data: DeepPartial<User>) {
    await this.userRepo.update({ id }, data as any);
    return this.userRepo.findOne({ where: { id } });
  }

  async countUsers(clientId: number) {
    return this.userRepo.count({ where: { clientId } });
  }

  async createWallet(data: DeepPartial<Wallet>) {
    return this.walletRepo.save(this.walletRepo.create(data));
  }

  async findUnverifiedUserByContact(clientId: number, email: string | null, phone: string | null) {
    return this.unverifiedUserRepo.findOne({
      where: { clientId, email: email ?? IsNull(), phone: phone ?? IsNull() },
    });
  }

  async createUnverifiedUser(data: DeepPartial<UnverifiedUser>) {
    return this.unverifiedUserRepo.save(this.unverifiedUserRepo.create(data));
  }

  async findUnverifiedUserById(id: number, clientId?: number) {
    return this.unverifiedUserRepo.findOne({ where: { id, ...(clientId && { clientId }) } });
  }

  async deleteUnverifiedUser(id: number) {
    return this.unverifiedUserRepo.delete({ id });
  }

  async findPrefixConfig(clientId: number) {
    return this.prefixConfigRepo.findOne({ where: { clientId } });
  }

  async findCredentialConfig(clientId: number) {
    return this.credentialConfigRepo.findOne({ where: { clientId } });
  }

  async findClientDetailsByClientId(clientId: number) {
    return this.clientDetailsRepo.findOne({ where: { clientId } });
  }

  async findVendorByField(field: string, clientId?: number) {
    return this.vendorRepo.findOne({
      where: [
        { email: field, ...(clientId ? { clientId } : {}) },
        { phone: field, ...(clientId ? { clientId } : {}) },
      ],
    });
  }

  async findVendorById(id: number, relations?: any) {
    return this.vendorRepo.findOne({
      where: { id },
      relations,
    });
  }

  async findVendorByEmail(email: string) {
    return this.vendorRepo.findOne({ where: { email } });
  }

  async updateVendorPassword(id: number, passwordHash: string) {
    await this.vendorRepo.update({ id }, { password: passwordHash });
  }

  async findVendorByEmailAndClientSelect(email: string, clientId: number) {
    return this.vendorRepo.findOne({
      where: { email, clientId },
      select: { id: true, email: true },
    });
  }
}
