import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AdminDriverRepository } from '../repositories/admin-driver.repository';
import { CreateDriverDto, UpdateDriverDto } from '../dto/admin-driver.dto';

/** Mirrors `controllers/vendors/Fleet/driverController.js`. */
@Injectable()
export class VendorDriverService {
  constructor(private readonly repo: AdminDriverRepository) {}

  async getAllFleetDrivers(fleetId: number, clientId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [rows, count] = await this.repo.findAndCountDriversByFleet(fleetId, clientId, skip, limit);

    return {
      success: true,
      message: 'Drivers fetched successfully',
      data: rows,
      pagination: { totalItems: count, totalPages: Math.ceil(count / limit), currentPage: page },
    };
  }

  async createFleetDriver(clientId: number, dto: CreateDriverDto) {
    const existingDriver = await this.repo.findExistingDriverByEmailOrPhone(dto.fleetId, clientId, dto.email, dto.phone);
    if (existingDriver) {
      throw new BadRequestException({ success: false, message: 'Driver with provided email or phone already exists' });
    }

    const driverCount = await this.repo.countDriversByFleet(dto.fleetId, clientId);
    const newDriver = await this.repo.createDriver({
      fleetId: dto.fleetId,
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      licenseNumber: dto.licenseNumber,
      aadharNumber: dto.aadharNumber,
      panNumber: dto.panNumber,
      address: dto.address,
      type: 'DRIVER',
      clientId,
    } as any);

    const prefixConfigValue = await this.repo.findPrefixConfig(clientId);
    const drIdFormat = `${prefixConfigValue?.driver ?? ''}${String(driverCount + 1).padStart(5, '0')}`;
    await this.repo.updateDriverDrId(newDriver.id, drIdFormat);
    newDriver.drId = drIdFormat;

    return { success: true, message: 'Driver created successfully', data: newDriver };
  }

  async updateFleetDriver(driverId: number, clientId: number, dto: UpdateDriverDto) {
    const driver = await this.repo.findDriverByIdAndClient(driverId, clientId);
    if (!driver) {
      throw new NotFoundException({ success: false, message: 'Driver not found' });
    }

    if (dto.status === 'Active') {
      const fleet = await this.repo.findFleetDetailByIdAndClient(driver.fleetId!, clientId);
      if (!fleet) {
        throw new NotFoundException({ success: false, message: 'Fleet not found' });
      }
      if (fleet.status === 'Block') {
        throw new BadRequestException({ success: false, message: 'Cannot update driver. Fleet is blocked.' });
      }
    }

    const updated = await this.repo.updateDriver(driverId, {
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      status: dto.status as any,
      licenseNumber: dto.licenseNumber,
      aadharNumber: dto.aadharNumber,
      panNumber: dto.panNumber,
      address: dto.address,
    });

    return { success: true, message: 'Driver updated successfully', data: updated };
  }

  async getFleetDriverById(driverId: number, clientId: number) {
    const driver = await this.repo.findDriverByIdAndClient(driverId, clientId);
    if (!driver) {
      throw new NotFoundException({ success: false, message: 'Driver not found' });
    }
    return { success: true, message: 'Driver updated successfully', data: driver };
  }
}
