import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AwsService } from '@integrations/aws';
import { generateDummyPassword } from '@app/common';
import { AdminFleetUserRepository } from '../repositories/admin-fleet-user.repository';
import { CreateFleetUserDto, UpdateFleetUserDto, FleetBlockUnblockDto } from '../dto/admin-fleet-user.dto';

/** Mirrors `controllers/admin/fleet/fleetUserController.js`. */
@Injectable()
export class AdminFleetUserService {
  constructor(
    private readonly repo: AdminFleetUserRepository,
    private readonly awsService: AwsService,
  ) {}

  async createFleetUser(clientId: number, staffId: number, dto: CreateFleetUserDto) {
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
          staffId,
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
        // Mirrors legacy `sendGlobalFleetUserCredentials` — client-branded template
        // (primaryColor/logoUrl/brandName/fleetUrl login link from this tenant's ClientDetails).
        this.awsService
          .sendFleetUserCredentialsEmail(fleetDetail.cName ?? '', fleetUser.email, dummyPassword, clientDetails)
          .catch((err) => console.error('Mail failed:', err.message));
      }
    });

    return { success: true, message: 'Fleet user created successfully' };
  }

  async updateFleetUser(fleetUserId: number, clientId: number, staffId: number, dto: UpdateFleetUserDto) {
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

  async getAllFleetUsers(clientId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [rows, count] = await this.repo.findAndCountFleetUserDetails(clientId, skip, limit);

    return {
      success: true,
      message: 'Fleet users fetched successfully',
      data: rows,
      pagination: { totalItems: count, totalPages: Math.ceil(count / limit), currentPage: page },
    };
  }

  async getFleetUserDetailsById(fleetUserId: number, clientId: number) {
    const fleetUserDetail = await this.repo.findFleetUserDetailWithWallet(fleetUserId, clientId);
    if (!fleetUserDetail) {
      throw new NotFoundException({ success: false, message: 'Fleet user not found' });
    }

    const wallet = await this.repo.findWalletByFleet(fleetUserId);

    return { success: true, message: 'Fleet user details fetched successfully', data: { ...fleetUserDetail, wallet } };
  }

  async getFleetUsersAll(clientId: number) {
    const fleetUsers = await this.repo.findAllFleetUserDetailsSimple(clientId);
    return { success: true, message: 'Fleet users retrieved successfully', data: fleetUsers };
  }

  async fleetBlockAndUnblock(fleetDetailId: number, clientId: number, dto: FleetBlockUnblockDto) {
    await this.repo.updateFleetUserDetailStatus(fleetDetailId, clientId, dto.status);

    const fleet = await this.repo.findFleetUserDetailById(fleetDetailId, clientId);
    if (!fleet) {
      throw new NotFoundException({ success: false, message: 'Fleet user not found' });
    }

    if (fleet.status === 'Block') {
      await this.repo.bulkUpdateFleetUsersStatusByFleet(fleet.id, 'Active', 'InActive', clientId);
      await this.repo.bulkDisableVehicleAutoChargeByFleet(fleet.id, clientId);
      await this.repo.expireActiveRfidTagsByFleet(fleet.id, clientId);
    }

    if (fleet.status === 'Active') {
      await this.repo.bulkUpdateFleetUsersStatusByFleet(fleet.id, 'InActive', 'Active', clientId);
    }

    return { success: true, message: `${dto.status} successfully` };
  }
}
