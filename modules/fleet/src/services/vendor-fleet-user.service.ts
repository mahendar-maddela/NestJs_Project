import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AwsService } from '@integrations/aws';
import { generateDummyPassword } from '@app/common';
import { AdminFleetUserRepository } from '../repositories/admin-fleet-user.repository';
import { CreateVendorFleetUserDto, UpdateVendorFleetUserDto } from '../dto/vendor-fleet-user.dto';

function buildCredentialsEmailHtml(cName: string, email: string, password: string, brandName?: string | null): string {
  return `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #333;">
      <h2>Fleet Account Created</h2>
      <p>Dear ${cName},</p>
      <p>Your fleet account with ${brandName ?? 'us'} has been created. Use the credentials below to log in:</p>
      <table cellpadding="8" style="border:1px solid #eee;border-radius:6px;">
        <tr><td>Email</td><td><strong>${email}</strong></td></tr>
        <tr><td>Password</td><td><strong>${password}</strong></td></tr>
      </table>
      <p>Please change your password after your first login.</p>
    </div>
  `;
}

/** Mirrors `controllers/vendors/Fleet/fleetUserController.js`. */
@Injectable()
export class VendorFleetUserService {
  constructor(
    private readonly repo: AdminFleetUserRepository,
    private readonly awsService: AwsService,
  ) {}

  async createFleetUser(vendorId: number, clientId: number, dto: CreateVendorFleetUserDto) {
    const existingUser = await this.repo.findFleetUserByEmailOrPhone(clientId, dto.email, dto.phone);
    if (existingUser) {
      throw new BadRequestException({ success: false, message: 'User with provided email or phone already exists' });
    }

    const dummyPassword = generateDummyPassword();
    const hashedPassword = await bcrypt.hash(dummyPassword, 10);

    await this.repo.runInTransaction(async ({ fleetUser: fleetUserRepo, fleetUserDetail: fleetUserDetailRepo, wallet: walletRepo }) => {
      const fleetUser = await fleetUserRepo.save(
        fleetUserRepo.create({
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
          password: hashedPassword,
          type: 'FLEET_MANAGER',
          status: 'Active',
          clientId,
        }),
      );

      const fleetCount = await fleetUserDetailRepo.count({ where: { clientId } });

      const fleetDetail = await fleetUserDetailRepo.save(
        fleetUserDetailRepo.create({
          cName: dto.cName,
          gst: dto.gst,
          noOfGroups: dto.noOfGroups ?? null,
          noOfVehicle: dto.noOfVehicle ?? null,
          noOfDrivers: dto.noOfDrivers ?? null,
          remoteStart: dto.remoteStart ?? false,
          vendorId,
          clientId,
        }),
      );

      const fleetEmpCount = await fleetUserRepo.count({ where: { clientId, fleetId: fleetDetail.id } });

      const prefixConfigValue = await this.repo.findPrefixConfig(clientId);
      const drIdFormat = `${prefixConfigValue?.fleet ?? ''}M${fleetEmpCount.toString().padStart(5, '0')}`;
      await fleetUserRepo.update(fleetUser.id, { fleetId: fleetDetail.id, drId: drIdFormat });

      const fleetUId = `${prefixConfigValue?.fleet ?? ''}${(fleetCount + 1).toString().padStart(5, '0')}`;
      await fleetUserDetailRepo.update(fleetDetail.id, { fleetUId });

      await walletRepo.save(walletRepo.create({ fleetId: fleetDetail.id, balance: 0, type: 'Fleet', status: 'Active', clientId }));

      const clientDetails = await this.repo.findClientDetails(clientId);
      if (fleetUser.email) {
        this.awsService
          .sendEmail(
            fleetUser.email,
            'Fleet Account Created',
            clientDetails?.brandName ?? 'Nexinev',
            buildCredentialsEmailHtml(fleetDetail.cName ?? '', fleetUser.email, dummyPassword, clientDetails?.brandName),
          )
          .catch((err) => console.error('Mail failed:', err.message));
      }
    });

    return { success: true, message: 'Fleet user created successfully' };
  }

  async updateFleetUser(fleetUserId: number, clientId: number, dto: UpdateVendorFleetUserDto) {
    const fleetUser = await this.repo.findFleetUserByIdAndClient(fleetUserId, clientId);
    if (!fleetUser) {
      throw new NotFoundException({ success: false, message: 'Fleet user not found' });
    }

    if (dto.email || dto.phone) {
      const duplicate = await this.repo.findFleetUserByEmailOrPhoneExcludingId(clientId, fleetUserId, dto.email, dto.phone);
      if (duplicate) {
        throw new BadRequestException({ success: false, message: 'Email or phone already exists' });
      }
    }

    await this.repo.runInTransaction(async ({ fleetUser: fleetUserRepo, fleetUserDetail: fleetUserDetailRepo }) => {
      await fleetUserRepo.update(fleetUserId, {
        name: dto.name ?? fleetUser.name,
        email: dto.email ?? fleetUser.email,
        phone: dto.phone ?? fleetUser.phone,
      });

      if (fleetUser.fleetId) {
        const fleetDetail = await fleetUserDetailRepo.findOne({ where: { id: fleetUser.fleetId } });
        if (fleetDetail) {
          await fleetUserDetailRepo.update(fleetDetail.id, {
            cName: dto.cName ?? fleetDetail.cName,
            gst: dto.gst ?? fleetDetail.gst,
            remoteStart: dto.remoteStart ?? fleetDetail.remoteStart,
            noOfGroups: dto.noOfGroups !== undefined ? dto.noOfGroups : fleetDetail.noOfGroups,
            noOfVehicle: dto.noOfVehicle !== undefined ? dto.noOfVehicle : fleetDetail.noOfVehicle,
            noOfDrivers: dto.noOfDrivers !== undefined ? dto.noOfDrivers : fleetDetail.noOfDrivers,
          });
        }
      }
    });

    return { success: true, message: 'Fleet user updated successfully' };
  }

  async getAllFleetUsers(vendorId: number, clientId: number, search: string | undefined, page: number | null, limit: number | null) {
    if (!page && !limit) {
      const fleet = await this.repo.findAllFleetUserDetailsSimpleByVendor(clientId, vendorId);
      return { success: true, message: 'Fleet  fetched successfully', data: fleet };
    }

    const skip = (page! - 1) * limit!;
    const [rows, count] = await this.repo.findAndCountFleetUserDetailsByVendor(vendorId, clientId, search, skip, limit!);

    return {
      success: true,
      message: 'Fleet fetched successfully',
      data: rows,
      pagination: { totalItems: count, totalPages: Math.ceil(count / limit!), currentPage: page },
    };
  }

  async getFleetUserDetailsById(fleetId: number, vendorId: number, clientId: number) {
    // Legacy scopes this lookup by `{id, clientId}` only — scoped here by vendorId too, matching
    // the sibling `getAllFleetUsers` list endpoint's own vendor scoping.
    const fleetUserDetail = await this.repo.findFleetUserDetailByIdVendorClient(fleetId, vendorId, clientId);
    if (!fleetUserDetail) {
      throw new NotFoundException({ success: false, message: 'Fleet user not found' });
    }

    const wallet = await this.repo.findWalletByFleet(fleetId);
    return { success: true, message: 'Fleet user details fetched successfully', data: { ...fleetUserDetail, wallet } };
  }

  async fleetCardCounts(vendorId: number, clientId: number) {
    const vendorFleets = await this.repo.findVendorFleetIds(vendorId, clientId);
    const fleetIds = vendorFleets.map((f) => f.id);

    const [totalGroups, totalVehicles, totalDrivers] = await Promise.all([
      this.repo.countGroupsByFleetIds(fleetIds),
      this.repo.countVehiclesByFleetIds(fleetIds),
      this.repo.countDriversByFleetIds(fleetIds),
    ]);

    return {
      success: true,
      message: 'Counts fetched successfully',
      data: { totalFleet: fleetIds.length, totalGroups, totalVehicles, totalDrivers },
    };
  }
}
